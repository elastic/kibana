/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { castArray } from 'lodash';
import { PassThrough, Readable, Transform } from 'stream';
import { isGeneratorObject } from 'util/types';
import {
  ESDocumentWithOperation,
  SynthtraceESAction,
  SynthtraceGenerator,
} from '../../../../types';
import { Logger } from '../../../utils/create_logger';
import { fork, parallel, pipeline } from '../../../utils/stream_utils';
import { createBreakdownMetricsAggregator } from '../../aggregators/create_breakdown_metrics_aggregator';
import { createSpanMetricsAggregator } from '../../aggregators/create_span_metrics_aggregator';
import { createTransactionMetricsAggregator } from '../../aggregators/create_transaction_metrics_aggregator';
import { ApmFields } from '../../apm_fields';
import { getApmServerMetadataTransform } from './get_apm_server_metadata_transform';
import { getDedotTransform } from './get_dedot_transform';
import { getIntakeDefaultsTransform } from './get_intake_defaults_transform';
import { getRoutingTransform } from './get_routing_transform';
import { getSerializeTransform } from './get_serialize_transform';

export interface ApmSynthtraceEsClientOptions {
  version: string;
  concurrency?: number;
  refreshAfterIndex?: boolean;
}

type MaybeArray<T> = T | T[];

const DATA_STREAMS = ['traces-apm*', 'metrics-apm*', 'logs-apm*'];

export class ApmSynthtraceEsClient {
  private readonly client: Client;
  private readonly logger: Logger;

  private readonly concurrency: number;

  private readonly refreshAfterIndex: boolean;

  private readonly version: string;

  constructor(options: { client: Client; logger: Logger } & ApmSynthtraceEsClientOptions) {
    this.client = options.client;
    this.logger = options.logger;
    this.concurrency = options.concurrency ?? 1;
    this.refreshAfterIndex = options.refreshAfterIndex ?? false;
    this.version = options.version;
  }

  async runningVersion() {
    const info = await this.client.info();
    return info.version.number;
  }

  async clean() {
    this.logger.info(`Cleaning APM data streams ${DATA_STREAMS.join(', ')}`);

    for (const name of DATA_STREAMS) {
      const dataStream = await this.client.indices.getDataStream({ name }, { ignore: [404] });
      if (dataStream.data_streams && dataStream.data_streams.length > 0) {
        this.logger.debug(`Deleting datastream: ${name}`);
        await this.client.indices.deleteDataStream({ name });
      }
    }
  }

  async refresh(dataStreams: string[] = DATA_STREAMS) {
    this.logger.info(`Refreshing ${dataStreams.join(',')}`);

    return this.client.indices.refresh({
      index: dataStreams,
      allow_no_indices: true,
      ignore_unavailable: true,
    });
  }

  async index(streamOrGenerator: MaybeArray<Readable | SynthtraceGenerator<ApmFields>>) {
    const allStreams = castArray(streamOrGenerator).map((obj) => {
      const base = isGeneratorObject(obj) ? Readable.from(obj) : obj;

      const aggregators = [
        createTransactionMetricsAggregator('1m'),
        createSpanMetricsAggregator('1m'),
      ];

      return pipeline(
        base,
        getSerializeTransform(),
        getIntakeDefaultsTransform(),
        fork(new PassThrough({ objectMode: true }), ...aggregators),
        createBreakdownMetricsAggregator('30s'),
        getApmServerMetadataTransform(this.version),
        getRoutingTransform(),
        getDedotTransform()
      );
    }) as [Transform];

    let count: number = 0;

    const stream = parallel(...allStreams);

    await this.client.helpers.bulk({
      concurrency: this.concurrency,
      refresh: false,
      refreshOnCompletion: false,
      flushBytes: 500000,
      datasource: stream,
      onDocument: (doc: ESDocumentWithOperation<ApmFields>) => {
        // console.log('onDocument', doc);
        let action: SynthtraceESAction;
        count++;

        if (doc._action) {
          action = doc._action!;
          delete doc._action;
        } else if (doc._index) {
          action = { create: { _index: doc._index } };
          delete doc._index;
        } else {
          throw new Error(`_action or _index not set in document`);
        }

        return action;
      },
      onDrop: (doc) => {
        this.logger.error(`Dropped document: ${JSON.stringify(doc, null, 2)}`);
      },
    });

    this.logger.info(`Produced ${count} events`);

    if (this.refreshAfterIndex) {
      await this.refresh();
    }
  }
}
