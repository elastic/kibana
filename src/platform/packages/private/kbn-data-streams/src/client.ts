/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { Client, TransportRequestOptionsWithOutMeta } from '@elastic/elasticsearch';
import type api from '@elastic/elasticsearch/lib/api/types';
import type { MappingsToProperties } from '@kbn/es-mappings';
import type {
  BaseSearchRuntimeMappings,
  IDataStreamClientIndexRequest,
  IDataStreamClientBulkRequest,
  SearchRequestImproved,
} from './types';
import { initialize } from './initialize';
import { validateClientArgs } from './validate_client_args';

import type { DataStreamDefinition, IDataStreamClient, ClientHelpers } from './client_type';

type ElasticsearchClient = Omit<
  Client,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

export class DataStreamClient<Definition extends DataStreamDefinition, SRM extends any>
  implements IDataStreamClient<Definition>
{
  public helpers: ClientHelpers<SRM> = {
    getFieldsFromHit: (hit) => {
      const fields = (hit.fields ?? {}) as Record<keyof SRM, unknown[]>;
      return fields;
    },
  };
  private readonly runtimeFields: string[];
  private constructor(
    private readonly client: ElasticsearchClient,
    private readonly dataStreamDefinition: DataStreamDefinition
  ) {
    this.runtimeFields = Object.keys(dataStreamDefinition.searchRuntimeMappings ?? {});
  }

  public async index(args: IDataStreamClientIndexRequest<S>) {
    return this.client.index({
      index: this.dataStreamDefinition.name,
      ...args,
    });
  }

  public async bulk(args: IDataStreamClientBulkRequest<S>) {
    return this.client.bulk({
      index: this.dataStreamDefinition.name,
      ...args,
    });
  }

  public async search<Agg extends Record<string, api.AggregationsAggregate> = {}>(
    args: SearchRequestImproved<S, SRM>,
    transportOpts?: TransportRequestOptionsWithOutMeta
  ) {
    return this.client.search<MappingsToProperties<S>, Agg>(
      {
        index: this.dataStreamDefinition.name,
        runtime_mappings: this.dataStreamDefinition.searchRuntimeMappings,
        fields: this.runtimeFields,
        ...args,
      },
      transportOpts
    );
  }

  /**
   * This function ensures setup has been run before returning an instance of the client.
   *
   * @remark This function should execute early in the application lifecycle and preferably once per
   *         data stream. However, it should be idempotent.
   */
  public static async initialize<S extends object, SRM extends BaseSearchRuntimeMappings>(args: {
    dataStream: DataStreamDefinition;
    elasticsearchClient: ElasticsearchClient;
    logger: Logger;
  }): Promise<DataStreamClient<S, SRM>> {
    validateClientArgs(args);
    await initialize(args);
    return new DataStreamClient<S, SRM>(args.elasticsearchClient, args.dataStream);
  }

  // TODO: expose a create function that skips initialization
}
