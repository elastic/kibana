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

interface StartDeps {
  elasticsearch: InternalElasticsearchServiceStart;
}

/** @internal */
export class DataStreamsService implements CoreService<DataStreamsSetup, DataStreamsStart> {
  private readonly logger: Logger;

  private readonly dataStreamDefinitions: Map<string, AnyDataStreamDefinition> = new Map();

  private readonly dataStreamClients: Map<string, undefined | AnyIDataStreamClient> = new Map();

  constructor(private readonly coreContext: CoreContext) {
    this.logger = this.coreContext.logger.get('data-streams');
  }

  setup() {
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

  async start({ elasticsearch }: StartDeps) {
    const limit = pLimit(5);
    const setupPromises: Promise<void>[] = [];

    const nonInitializedDataStreams = Array.from(this.dataStreamClients.entries())
      .filter(([_, client]) => client === undefined)
      .map(([name]) => name);
    const elasticsearchClient = elasticsearch.client.asInternalUser;
    for (const dataStreamName of nonInitializedDataStreams) {
      const dataStreamDefinition = this.dataStreamDefinitions.get(dataStreamName);
      if (!dataStreamDefinition) {
        throw new Error(`Data stream ${dataStreamName} is not registered.`);
      }

      setupPromises.push(
        limit(async () => {
          this.dataStreamClients.set(
            dataStreamName,
            await DataStreamClient.initialize({
              dataStream: dataStreamDefinition,
              elasticsearchClient,
              logger: this.logger,
            })
          );
        })
      );
    }

    await Promise.all(setupPromises);

    return {
      getClient: <
        S extends MappingsDefinition,
        FullDocumentType extends GetFieldsOf<S> = GetFieldsOf<S>,
        SRM extends BaseSearchRuntimeMappings = never
      >(
        dataStreamName: string
      ): IDataStreamClient<S, FullDocumentType, SRM> => {
        if (!this.dataStreamDefinitions.has(dataStreamName)) {
          throw new Error(`Data stream ${dataStreamName} is not registered.`);
        }

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
