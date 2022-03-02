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
import { EntityIterable } from '../../entity_iterable';
import { StreamProcessor } from '../../stream_processor';
import { EntityStreams } from '../../entity_streams';
import { Fields } from '../../entity';

export interface StreamToBulkOptions<TFields extends Fields = ApmFields> {
  concurrency?: number;
  // the maximum number of documents to process
  maxDocs?: number;
  // the number of documents to flush the bulk operation defaults to 10k
  flushInterval?: number;
  mapToIndex?: (document: Record<string, any>) => string;
  dryRun: boolean;
  itemStartStopCallback?: (item: TFields | null, done: boolean) => void;
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

  async index<TFields>(
    events: EntityIterable<TFields> | Array<EntityIterable<TFields>>,
    options?: StreamToBulkOptions,
    streamProcessor?: StreamProcessor
  ) {
    const dataStream = Array.isArray(events) ? new EntityStreams(events) : events;

    const source =
      streamProcessor != null
        ? streamProcessor
        : new StreamProcessor({
            processors: StreamProcessor.apmProcessors,
            maxSourceEvents: options?.maxDocs,
            logger: this.logger,
          });

    let item: Record<any, any> | null = null;
    let yielded = 0;
    if (options?.dryRun) {
      await this.logger.perf('enumerate_scenario', async () => {
        // @ts-ignore
        // We just want to enumerate
        for await (item of source.streamToDocumentAsync(StreamProcessor.toDocument, dataStream)) {
          if (yielded === 0) {
            options.itemStartStopCallback?.apply(this, [item, false]);
            yielded++;
          }
        }
        options.itemStartStopCallback?.apply(this, [item, true]);
      });
      return;
    }

    const writeTargets = await this.getWriteTargets();
    // TODO logger.perf
    await this.client.helpers.bulk<ApmFields>({
      concurrency: options?.concurrency ?? 10,
      refresh: false,
      refreshOnCompletion: false,
      flushInterval: options?.flushInterval ?? StreamProcessor.defaultFlushInterval,
      // TODO https://github.com/elastic/elasticsearch-js/issues/1610
      // having to map here is awkward, it'd be better to map just before serialization.
      datasource: source.streamToDocumentAsync(StreamProcessor.toDocument, dataStream),
      onDrop: (doc) => {
        this.logger.info(doc);
      },
      // TODO bug in client not passing generic to BulkHelperOptions<>
      // https://github.com/elastic/elasticsearch-js/issues/1611
      onDocument: (doc: unknown) => {
        item = doc as Record<string, any>;
        if (yielded === 0) {
          options?.itemStartStopCallback!(item, false);
          yielded++;
        }
        const index = options?.mapToIndex
          ? options?.mapToIndex(item)
          : this.forceDataStreams
          ? StreamProcessor.getDataStreamForEvent(item, writeTargets)
          : StreamProcessor.getIndexForEvent(item, writeTargets);
        return { create: { _index: index } };
      },
    });
    options?.itemStartStopCallback?.apply(this, [item, true]);

    const indices = Object.values(writeTargets);
    this.logger.info(`Indexed all data attempting to refresh: ${indices}`);

    return this.client.indices.refresh({
      index: indices,
      allow_no_indices: true,
      ignore_unavailable: true,
    });
  }
}
