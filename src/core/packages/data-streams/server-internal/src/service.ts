/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pLimit from 'p-limit';
import {
  type AnyIDataStreamClient,
  type IDataStreamClient,
  type AnyDataStreamDefinition,
  DataStreamClient,
} from '@kbn/data-streams';
import type { InternalElasticsearchServiceStart } from '@kbn/core-elasticsearch-server-internal';

import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type {
  BaseSearchRuntimeMappings,
  DataStreamsSetup,
  DataStreamsStart,
} from '@kbn/core-data-streams-server';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { firstValueFrom } from 'rxjs';
import { DataStreamsConfig, config, type DataStreamsConfigType } from './config';

interface StartDeps {
  elasticsearch: InternalElasticsearchServiceStart;
}

/** @internal */
export class DataStreamsService implements CoreService<DataStreamsSetup, DataStreamsStart> {
  private readonly logger: Logger;
  private config?: DataStreamsConfig;
  private readonly dataStreamDefinitions: Map<string, AnyDataStreamDefinition> = new Map();

  private readonly dataStreamClients: Map<string, undefined | AnyIDataStreamClient> = new Map();

  constructor(private readonly coreContext: CoreContext) {
    this.logger = this.coreContext.logger.get('data-streams');
  }

  async setup() {
    const dataStreamsConfig = await firstValueFrom(
      this.coreContext.configService.atPath<DataStreamsConfigType>(config.path)
    );

    this.config = new DataStreamsConfig(dataStreamsConfig);

    return {
      registerDataStream: (dataStreamDefinition: AnyDataStreamDefinition) => {
        if (this.dataStreamDefinitions.has(dataStreamDefinition.name)) {
          throw new Error(`Data stream ${dataStreamDefinition.name} is already registered.`);
        }

        this.dataStreamDefinitions.set(dataStreamDefinition.name, dataStreamDefinition);
        this.dataStreamClients.set(dataStreamDefinition.name, undefined);
      },
    };
  }

  private async initializeDataStream(
    dataStreamName: string,
    elasticsearchClient: ElasticsearchClient,
    lazyCreation: boolean
  ) {
    if (this.dataStreamClients.get(dataStreamName)) {
      // already initialized
      return;
    }

    const dataStreamDefinition = this.dataStreamDefinitions.get(dataStreamName);
    if (!dataStreamDefinition) {
      throw new Error(`Data stream ${dataStreamName} is not registered.`);
    }

    const maybeInitializedClient = await DataStreamClient.initialize({
      dataStream: dataStreamDefinition,
      elasticsearchClient,
      logger: this.logger,
      lazyCreation,
    });

    this.dataStreamClients.set(dataStreamName, maybeInitializedClient);
  }

  private async initializeAllDataStreams(elasticsearchClient: ElasticsearchClient) {
    const limit = pLimit(5);
    const setupPromises: Promise<void>[] = [];

    const allDataStreamNames = Array.from(this.dataStreamDefinitions.keys());
    for (const dataStreamName of allDataStreamNames) {
      setupPromises.push(
        limit(() => this.initializeDataStream(dataStreamName, elasticsearchClient, true))
      );
    }

    await Promise.all(setupPromises);
  }

  async start({ elasticsearch }: StartDeps): Promise<DataStreamsStart> {
    const elasticsearchClient = elasticsearch.client.asInternalUser;
    const skipInitialization = this.config?.migrations.skip;
    if (skipInitialization) {
      this.logger.warn(
        'Skipping eager initialization and migrations of all data streams on startup.'
      );
    } else {
      this.logger.debug('Initializing all data streams');
      await this.initializeAllDataStreams(elasticsearchClient);
    }

    return {
      initializeClient: async <
        S extends MappingsDefinition,
        FullDocumentType extends GetFieldsOf<S> = GetFieldsOf<S>,
        SRM extends BaseSearchRuntimeMappings = never
      >(
        dataStreamName: string
      ): Promise<IDataStreamClient<S, FullDocumentType, SRM>> => {
        if (!this.dataStreamDefinitions.has(dataStreamName)) {
          throw new Error(`Data stream ${dataStreamName} is not registered.`);
        }

        // initialize the data stream if it is not already initialized, disable lazy creation
        await this.initializeDataStream(dataStreamName, elasticsearchClient, false);

        const dataStreamClient = this.dataStreamClients.get(dataStreamName);
        if (!dataStreamClient) {
          throw new Error(
            `Data stream client for ${dataStreamName} is not initialized. Are you sure you are providing the same definition as in setup?`
          );
        }
        return dataStreamClient;
      },
    };
  }

  stop() {}
}
