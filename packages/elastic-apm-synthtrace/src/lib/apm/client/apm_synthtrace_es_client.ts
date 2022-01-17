/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { cleanWriteTargets } from '../../utils/clean_write_targets';
import { getApmWriteTargets } from '../utils/get_apm_write_targets';
import { Logger } from '../../utils/create_logger';
import { ApmElasticsearchOutputWriteTargets } from '../utils/apm_events_to_elasticsearch_output';
import { ApmFields } from '../apm_fields';
import { SpanIterable } from '../../span_iterable';
import { StreamProcessor } from '../../stream_processor';

export class ApmSynthtraceEsClient {
  constructor(
    private readonly client: Client,
    private readonly logger: Logger,
    private readonly forceDataStreams: boolean
  ) { }

  private getWriteTargets() {
    return getApmWriteTargets({ client: this.client, forceDataStreams: this.forceDataStreams });
  }

  clean() {
    return this.getWriteTargets().then((writeTargets) => {
      const indices = Object.values(writeTargets);
      this.logger.info(`Attempting to clean: ${indices}`)
      return cleanWriteTargets({
        client: this.client,
        targets: indices,
        logger: this.logger,
      });
    });
  }

  async index(events: SpanIterable, concurrency?: number) {
    const writeTargets = await this.getWriteTargets();
    // TODO logger.perf
    await this.client.helpers.bulk<ApmFields>({
      concurrency: concurrency,
      refresh: false,
      refreshOnCompletion: false,
      datasource: new StreamProcessor({processors: StreamProcessor.apmProcessors})
        .streamAsync(events),
      // TODO bug in client not passing generic to BulkHelperOptions<>
      onDrop: (doc) => {
        this.logger.info(doc);
      },
      onDocument: (doc: unknown) => {
        const d = doc as ApmFields;
        let index = this.getIndexForEvent(d, writeTargets);
        return { create: { _index: index } };
      },
    });

    const indices = Object.values(writeTargets)
    this.logger.info(`Indexed all data attempting to refresh: ${indices}`)

    return this.client.indices.refresh({
      index: indices,
      allow_no_indices: true
    });
  }

  private getIndexForEvent(d: ApmFields, writeTargets: ApmElasticsearchOutputWriteTargets) {
    const eventType = d['processor.event'] as keyof ApmElasticsearchOutputWriteTargets;
    let index = writeTargets[eventType];
    if (!this.forceDataStreams) {
      return index;
    }

    if (eventType == 'metric') {
      if (!d['service.name']) {
        index = 'metrics-apm.app-default';
      } else {
        const keys = Object.keys(d);
        let noTransactionData = keys.filter(key => key.startsWith('transaction')).length == 0;
        let noSpanData = keys.filter(key => key.startsWith('span')).length == 0;
        if (noSpanData || noTransactionData) {
          index = 'metrics-apm.app-default';
        }
      }
    }
    return index;
  }
}
