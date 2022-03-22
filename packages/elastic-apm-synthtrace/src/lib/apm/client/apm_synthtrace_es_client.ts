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
    private readonly forceLegacyIndices: boolean
  ) {}

  private getWriteTargets() {
    return getApmWriteTargets({ client: this.client, forceLegacyIndices: this.forceLegacyIndices });
  }

  async runningVersion() {
    const info = await this.client.info();
    return info.version.number;
  }

  async clean() {
    return this.getWriteTargets().then(async (writeTargets) => {
      const indices = Object.values(writeTargets);
      this.logger.info(`Attempting to clean: ${indices}`);
      if (this.forceLegacyIndices) {
        return cleanWriteTargets({
          client: this.client,
          targets: indices,
          logger: this.logger,
        });
      }
      for (const name of indices) {
        const dataStream = await this.client.indices.getDataStream({ name }, { ignore: [404] });
        if (dataStream.data_streams && dataStream.data_streams.length > 0) {
          this.logger.debug(`Deleting datastream: ${name}`);
          await this.client.indices.deleteDataStream({ name });
        }
      }
      return;
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

  async registerGcpRepository(connectionString: string) {
    // <client_name>:<bucket>[:base_path]
    const [clientName, bucket, basePath] = connectionString.split(':');
    if (!clientName)
      throw new Error(
        `client name is mandatory for gcp repostitory registration: ${connectionString}`
      );
    if (!bucket)
      throw new Error(`bucket is mandatory for gcp repostitory registration: ${connectionString}`);

    const name = `gcp-repository-${clientName}`;
    this.logger.info(`Registering gcp repository ${name}`);
    const putRepository = await this.client.snapshot.createRepository({
      name,
      type: 'gcs',
      settings: {
        // @ts-ignore
        // missing from es types
        bucket,
        client: clientName,
        base_path: basePath,
      },
    });
    this.logger.info(putRepository);

    this.logger.info(`Verifying gcp repository ${name}`);
    const verifyRepository = await this.client.snapshot.verifyRepository({ name });
    this.logger.info(verifyRepository);
  }

  async refresh() {
    const writeTargets = await this.getWriteTargets();

    const indices = Object.values(writeTargets);
    this.logger.info(`Indexed all data attempting to refresh: ${indices}`);

    return this.client.indices.refresh({
      index: indices,
      allow_no_indices: true,
      ignore_unavailable: true,
    });
  }

  async index<TFields>(
    events: EntityIterable<TFields> | Array<EntityIterable<TFields>>,
    options?: StreamToBulkOptions,
    streamProcessor?: StreamProcessor
  ) {
    const dataStream = Array.isArray(events) ? new EntityStreams(events) : events;

    const sp =
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
        for await (item of sp.streamToDocumentAsync(this.toDocument, dataStream)) {
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
      flushBytes: 500000,
      // TODO https://github.com/elastic/elasticsearch-js/issues/1610
      // having to map here is awkward, it'd be better to map just before serialization.
      datasource: sp.streamToDocumentAsync(this.toDocument, dataStream),
      onDrop: (doc) => {
        this.logger.info(JSON.stringify(doc, null, 2));
      },
      // TODO bug in client not passing generic to BulkHelperOptions<>
      // https://github.com/elastic/elasticsearch-js/issues/1611
      onDocument: (doc: unknown) => {
        item = doc as Record<string, any>;
        if (yielded === 0) {
          options?.itemStartStopCallback?.apply(this, [item, false]);
          yielded++;
        }
        const index = options?.mapToIndex
          ? options?.mapToIndex(item)
          : !this.forceLegacyIndices
          ? StreamProcessor.getDataStreamForEvent(item, writeTargets)
          : StreamProcessor.getIndexForEvent(item, writeTargets);
        return { create: { _index: index } };
      },
    });
    options?.itemStartStopCallback?.apply(this, [item, true]);
  }
}
