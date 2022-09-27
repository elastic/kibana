/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
import type { Client, ClientOptions } from '@elastic/elasticsearch';
import { Logger } from '../utils/create_logger';
import { SignalIterable } from '../streaming/signal_iterable';
import { StreamProcessor } from '../streaming/stream_processor';
import { MergedSignalsStream } from '../streaming/merged_signals_stream';
import { StreamAggregator } from '../streaming/stream_aggregator';
import { Fields } from '../../dsl/fields';
import { Signal } from '../../dsl/signal';
import { WriteTarget } from '../../dsl/write_target';
import { createSignalSerializer } from './signal_serializer';

export interface StreamToBulkOptions<TFields extends Fields> {
  concurrency?: number;
  // the maximum number of documents to process
  maxDocs?: number;
  // the number of documents to flush the bulk operation defaults to 10k
  flushInterval?: number;
  mapToIndex?: (document: Signal<TFields>) => WriteTarget | undefined;
  dryRun: boolean;
  itemStartStopCallback?: (item: TFields | null, done: boolean) => void;
}

export interface SynthtraceEsClientOptions {
  // defaults to true if unspecified
  refreshAfterIndex?: boolean;
  streamProcessor?: StreamProcessor<any>;
}

export class SynthtraceEsClient {
  private readonly refreshAfterIndex: boolean;
  private readonly client: Client;
  private readonly streamProcessor?: StreamProcessor<any>;
  constructor(
    client: Client,
    private readonly logger: Logger,
    options?: SynthtraceEsClientOptions
  ) {
    this.refreshAfterIndex = options?.refreshAfterIndex ?? true;
    this.streamProcessor = options?.streamProcessor;

    this.client = SynthtraceEsClient.createPatchedEsClient(client);
  }

  // hack because child() does not allow Serializer to be overridden
  public static createPatchedEsClient(client: Client): Client {
    const initialOptions = Reflect.ownKeys(client)
      .map((k) => (client as any)[k])
      .filter((o) => o != null)
      .find((o) => o.Serializer != null && o.sniffEndpoint != null) as ClientOptions;

    const serializer = initialOptions.Serializer;
    const clientOptions = Object.assign({}, initialOptions, {
      Connection: client.connectionPool.Connection,
      Serializer: createSignalSerializer(serializer),
    });
    // because e2e tests imports this package in public (client side) code
    // we need to shade the @elastic/elasticsearch import so that webpack
    // does not eagerly try to compile it on the client side which is explicitly
    // not supported the nodejs Elasticsearch client
    // @ts-ignore
    return new client.constructor(clientOptions);
  }

  async runningVersion() {
    const info = await this.client.info();
    return info.version.number;
  }

  async clean(writeTargets?: WriteTarget[]) {
    if (!writeTargets || writeTargets.length === 0) return;

    const indices = writeTargets.filter((t) => t.kind === 'index');
    const dataStreams = writeTargets.filter((t) => t.kind === 'dataStream');

    if (dataStreams.length > 0) {
      this.logger.info(`Attempting to clean ${dataStreams.length} data streams`);
      for (const stream of dataStreams) {
        const name = stream.target;
        const dataStream = await this.client.indices.getDataStream({ name }, { ignore: [404] });
        if (dataStream.data_streams && dataStream.data_streams.length > 0) {
          this.logger.debug(`Deleting data stream: ${name}`);
          await this.client.indices.deleteDataStream({ name });
        }
      }
    }
    if (indices.length > 0) {
      for (const { target } of indices) {
        const indexExists = await this.client.indices.exists({ index: target });
        if (indexExists) {
          this.logger.debug(`Deleting index: ${target}`);
          await this.client.indices.delete({ index: target });
        }
      }
    }
    return;
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

  async refresh(dataStreams?: string[]) {
    const indices = dataStreams ?? [];
    this.logger.info(`Indexed all data attempting to refresh: ${indices}`);

    return this.client.indices.refresh({
      index: indices,
      allow_no_indices: true,
      ignore_unavailable: true,
    });
  }

  async index<TFields>(
    events: SignalIterable<TFields> | Array<SignalIterable<TFields>>,
    streamProcessor?: StreamProcessor<TFields>,
    options?: StreamToBulkOptions<TFields>
  ) {
    const dataStream = Array.isArray(events) ? new MergedSignalsStream(events) : events;
    const sp = streamProcessor ?? (this.streamProcessor as StreamProcessor<TFields>);
    if (!sp) {
      throw new Error('A StreamProcessor needs to be provided on index() or the constructor');
    }

    let fields: TFields | null = null;
    let yielded = 0;
    if (options?.dryRun) {
      await this.logger.perf('enumerate_scenario', async () => {
        // @ts-ignore
        // We just want to enumerate
        for await (const streamableDoc of sp.streamAsync(dataStream)) {
          fields = streamableDoc.fields;
          if (yielded === 0) {
            options.itemStartStopCallback?.apply(this, [fields, false]);
            yielded++;
          }
        }
        options.itemStartStopCallback?.apply(this, [fields, true]);
      });
      return;
    }

    const seenWriteTargets = new Set<string>();
    // TODO logger.perf
    await this.client.helpers.bulk<Signal<TFields>>({
      concurrency: options?.concurrency ?? 10,
      refresh: false,
      refreshOnCompletion: false,
      flushBytes: 500000,
      // TODO https://github.com/elastic/elasticsearch-js/issues/1610
      // having to map here is awkward, it'd be better to map just before serialization.
      datasource: sp.streamAsync(dataStream),
      // datasource: sp.streamToDocumentAsync((e) => sp.toDocument(e), dataStream),
      onDrop: (doc) => {
        this.logger.info(JSON.stringify(doc, null, 2));
      },
      // TODO bug in client not passing generic to BulkHelperOptions<>
      // https://github.com/elastic/elasticsearch-js/issues/1611
      onDocument: (doc: Signal<TFields>) => {
        fields = doc.fields;
        if (yielded === 0) {
          options?.itemStartStopCallback?.apply(this, [fields, false]);
          yielded++;
        }
        // first ask the signal where to write.
        let index = doc.getWriteTarget();
        // if the stream processor has a callback specified it takes precedence over the
        // default from the signal. This allows Scenario's to deviate more easily.
        if (options?.mapToIndex) {
          const updatedIndex = options.mapToIndex(doc);
          if (updatedIndex) index = updatedIndex;
        }
        if (index && this.refreshAfterIndex) {
          seenWriteTargets.add(index.target);
        }
        return { create: { _index: index?.target } };
      },
    });
    options?.itemStartStopCallback?.apply(this, [fields, true]);

    if (this.refreshAfterIndex) {
      await this.refresh(Array.from(seenWriteTargets));
    }
  }

  async createDataStream(aggregator: StreamAggregator<Fields, Fields>) {
    const datastreamName = aggregator.getDataStreamName();
    const mappings = aggregator.getMappings();
    const dimensions = aggregator.getDimensions();

    const indexSettings: IndicesIndexSettings = { lifecycle: { name: 'metrics' } };
    if (dimensions.length > 0) {
      indexSettings.mode = 'time_series';
      indexSettings.routing_path = dimensions;
    }

    await this.client.cluster.putComponentTemplate({
      name: `${datastreamName}-mappings`,
      template: {
        mappings,
      },
      _meta: {
        description: `Mappings for ${datastreamName}-*`,
      },
    });
    this.logger.info(`Created mapping component template for ${datastreamName}-*`);

    await this.client.cluster.putComponentTemplate({
      name: `${datastreamName}-settings`,
      template: {
        settings: {
          index: indexSettings,
        },
      },
      _meta: {
        description: `Settings for ${datastreamName}-*`,
      },
    });
    this.logger.info(`Created settings component template for ${datastreamName}-*`);

    await this.client.indices.putIndexTemplate({
      name: `${datastreamName}-index_template`,
      index_patterns: [`${datastreamName}-*`],
      data_stream: {},
      composed_of: [`${datastreamName}-mappings`, `${datastreamName}-settings`],
      priority: 500,
    });
    this.logger.info(`Created index template for ${datastreamName}-*`);

    const dataStreamWithNamespace = datastreamName + '-default';
    const getDataStreamResponse = await this.client.indices.getDataStream(
      {
        name: dataStreamWithNamespace,
      },
      { ignore: [404] }
    );
    if (getDataStreamResponse.data_streams && getDataStreamResponse.data_streams.length === 0) {
      await this.client.indices.createDataStream({ name: dataStreamWithNamespace });
      this.logger.info(`Created data stream: ${dataStreamWithNamespace}.`);
    } else {
      this.logger.info(`Data stream: ${dataStreamWithNamespace} already exists.`);
    }

    await aggregator.bootstrapElasticsearch(this.client);
  }
}
