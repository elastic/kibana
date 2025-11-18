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
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';

import type { BaseSearchRuntimeMappings, IDataStreamClient, DataStreamDefinition } from './types';

import type { ClientHelpers } from './types/client';
import type {
  ClientSearchRequest,
  ClientIndexRequest,
  ClientBulkRequest,
  ClientGetRequest,
} from './types/es_api';

import { initialize } from './initialize';
import { validateClientArgs } from './validate_client_args';

type ElasticsearchClient = Omit<
  Client,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

export class DataStreamClient<
  Definition extends DataStreamDefinition,
  MappingsInDefinition extends MappingsDefinition = NonNullable<Definition['template']['mappings']>,
  FullDocumentType extends GetFieldsOf<MappingsInDefinition> = GetFieldsOf<MappingsInDefinition>,
  SRM extends BaseSearchRuntimeMappings = never
> implements IDataStreamClient<Definition, MappingsInDefinition, FullDocumentType, SRM>
{
  private readonly runtimeFields: string[];
  private constructor(
    private readonly client: ElasticsearchClient,
    private readonly dataStreamDefinition: DataStreamDefinition
  ) {
    this.runtimeFields = Object.keys(dataStreamDefinition.searchRuntimeMappings ?? {});
  }

  /**
   * This function ensures setup has been run before returning an instance of the client.
   *
   * @remark This function should execute early in the application lifecycle and preferably once per
   *         data stream. However, it should be idempotent.
   */
  public static async initialize<
    Definition extends DataStreamDefinition,
    FullDocumentType extends GetFieldsOf<
      NonNullable<Definition['template']['mappings']>
    > = GetFieldsOf<NonNullable<Definition['template']['mappings']>>,
    SRM extends BaseSearchRuntimeMappings = never
  >(args: {
    dataStream: DataStreamDefinition;
    elasticsearchClient: ElasticsearchClient;
    logger: Logger;
  }): Promise<
    DataStreamClient<
      Definition,
      NonNullable<Definition['template']['mappings']>,
      FullDocumentType,
      SRM
    >
  > {
    validateClientArgs(args);
    await initialize(args);
    return new DataStreamClient<
      Definition,
      NonNullable<Definition['template']['mappings']>,
      FullDocumentType,
      SRM
    >(args.elasticsearchClient, args.dataStream);
  }

  public helpers: ClientHelpers<SRM> = {
    getFieldsFromHit: (hit) => {
      const fields = (hit.fields ?? {}) as Record<keyof SRM, unknown[]>;
      return fields;
    },
  };

  public async index(args: ClientIndexRequest<any>) {
    return this.client.index({
      index: this.dataStreamDefinition.name,
      ...args,
    });
  }

  public async bulk(args: ClientBulkRequest<FullDocumentType>) {
    return this.client.bulk({
      index: this.dataStreamDefinition.name,
      ...args,
    });
  }

  public async get(args: ClientGetRequest) {
    return this.client.get<FullDocumentType>({
      index: this.dataStreamDefinition.name,
      ...args,
    });
  }

  public async existsIndex() {
    return this.client.indices.exists({
      index: this.dataStreamDefinition.name,
    });
  }

  public async search<Agg extends Record<string, api.AggregationsAggregate> = {}>(
    args: ClientSearchRequest<SRM>,
    transportOpts?: TransportRequestOptionsWithOutMeta
  ) {
    return this.client.search<FullDocumentType, Agg>(
      {
        index: this.dataStreamDefinition.name,
        runtime_mappings: this.dataStreamDefinition.searchRuntimeMappings,
        fields: this.runtimeFields,
        ...args,
      },
      transportOpts
    );
  }
}
