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
import { ApmFields } from '../apm_fields';
import { SpanIterable } from '../../span_iterable';
import { StreamProcessor } from '../../stream_processor';
import { SpanGeneratorsUnion } from '../../span_generators_union';

export interface StreamToBulkOptions {
  concurrency?: number;
  maxDocs?: number;
  mapToIndex?: (document: Record<string, any>) => string;
}

export class ApmSynthtraceEsClient {
  constructor(
    private readonly client: Client,
    private readonly logger: Logger,
    private readonly forceDataStreams: boolean
  ) {}

  private getWriteTargets() {
    return getApmWriteTargets({ client: this.client, forceDataStreams: this.forceDataStreams });
  }

  clean() {
    return this.getWriteTargets().then(async (writeTargets) => {
      const indices = Object.values(writeTargets);
      this.logger.info(`Attempting to clean: ${indices}`);
      if (this.forceDataStreams) {
        for (const name of indices) {
          const dataStream = await this.client.indices.getDataStream({ name }, { ignore: [404] });
          if (dataStream.data_streams && dataStream.data_streams.length > 0) {
            this.logger.debug(`Deleting datastream: ${name}`);
            await this.client.indices.deleteDataStream({ name });
          }
        }
        return;
      }

      return cleanWriteTargets({
        client: this.client,
        targets: indices,
        logger: this.logger,
      });
    });
  }

  async updateComponentTemplates(numberOfPrimaryShards: number) {
    const response = await this.client.cluster.getComponentTemplate({ name: '*apm*@custom' });
    for (const componentTemplate of response.component_templates) {
      if (componentTemplate.component_template._meta?.package?.name !== 'apm') continue;

      componentTemplate.component_template.template.settings = {
        index: {
          number_of_shards: numberOfPrimaryShards,
        },
      };

      const putTemplate = await this.client.cluster.putComponentTemplate({
        name: componentTemplate.name,
        ...componentTemplate.component_template,
      });
      this.logger.info(
        `- updated component template ${componentTemplate.name}, acknowledged: ${putTemplate.acknowledged}`
      );
    }
  }

  async index(events: SpanIterable | SpanIterable[], options?: StreamToBulkOptions) {
    const dataStream = Array.isArray(events) ? new SpanGeneratorsUnion(events) : events;

    const writeTargets = await this.getWriteTargets();
    // TODO logger.perf
    await this.client.helpers.bulk<ApmFields>({
      concurrency: options?.concurrency ?? 10,
      refresh: false,
      refreshOnCompletion: false,
      datasource: new StreamProcessor({
        processors: StreamProcessor.apmProcessors,
        maxSourceEvents: options?.maxDocs,
        logger: this.logger,
      })
        // TODO https://github.com/elastic/elasticsearch-js/issues/1610
        // having to map here is awkward, it'd be better to map just before serialization.
        .streamToDocumentAsync(StreamProcessor.toDocument, dataStream),
      onDrop: (doc) => {
        this.logger.info(doc);
      },
      // TODO bug in client not passing generic to BulkHelperOptions<>
      // https://github.com/elastic/elasticsearch-js/issues/1611
      onDocument: (doc: unknown) => {
        const d = doc as Record<string, any>;
        const index = options?.mapToIndex
          ? options?.mapToIndex(d)
          : this.forceDataStreams
          ? StreamProcessor.getDataStreamForEvent(d, writeTargets)
          : StreamProcessor.getIndexForEvent(d, writeTargets);
        return { create: { _index: index } };
      },
    });

    const indices = Object.values(writeTargets);
    this.logger.info(`Indexed all data attempting to refresh: ${indices}`);

    return this.client.indices.refresh({
      index: indices,
      allow_no_indices: true,
      ignore_unavailable: true,
    });
  }
}
