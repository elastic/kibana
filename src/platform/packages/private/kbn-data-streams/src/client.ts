/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { TransportRequestOptionsWithOutMeta } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type api from '@elastic/elasticsearch/lib/api/types';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import type { BaseSearchRuntimeMappings, IDataStreamClient, DataStreamDefinition } from './types';
import type { ClientHelpers } from './types/client';
import type { ClientSearchRequest, ClientCreateRequest, SpaceAwareDocument } from './types/es_api';

import { initialize } from './initialize';
import { validateClientArgs } from './validate_client_args';
import {
  generateSpacePrefixedId,
  throwOnIdWithSeparator,
  decorateDocumentWithSpace,
  buildSpaceFilter,
  buildSpaceAgnosticFilter,
} from './space_utils';

export const DEFAULT_SPACE = 'default';

export class DataStreamClient<
  MappingsInDefinition extends MappingsDefinition,
  FullDocumentType extends GetFieldsOf<MappingsInDefinition> = GetFieldsOf<MappingsInDefinition>,
  SRM extends BaseSearchRuntimeMappings = never
> implements IDataStreamClient<MappingsInDefinition, FullDocumentType, SRM>
{
  private readonly runtimeFields: string[];
  private constructor(
    private readonly client: ElasticsearchClient,
    private readonly dataStreamDefinition: DataStreamDefinition<
      MappingsInDefinition,
      FullDocumentType,
      SRM
    >
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
    MappingsInDefinition extends MappingsDefinition,
    FullDocumentType extends GetFieldsOf<MappingsInDefinition> = GetFieldsOf<MappingsInDefinition>,
    SRM extends BaseSearchRuntimeMappings = never
  >(args: {
    dataStream: DataStreamDefinition<MappingsInDefinition, FullDocumentType, SRM>;
    elasticsearchClient: ElasticsearchClient;
    logger: Logger;
    lazyCreation?: boolean;
  }) {
    validateClientArgs(args);
    const { dataStreamReady } = await initialize({ ...args, lazyCreation: args.lazyCreation });
    if (!dataStreamReady) {
      return;
    }

    return new DataStreamClient(args.elasticsearchClient, args.dataStream);
  }

  public helpers: ClientHelpers<SRM> = {
    getFieldsFromHit: (hit) => {
      const fields = (hit.fields ?? {}) as Record<keyof SRM, unknown[]>;
      return fields;
    },
  };

  public async create(args: ClientCreateRequest<FullDocumentType>) {
    const { space: rawSpace, documents, ...restArgs } = args;
    const space = rawSpace === '' ? DEFAULT_SPACE : rawSpace;

    // Convert documents to ES bulk format: [metadata, document] pairs
    const operations: Array<api.BulkOperationContainer | FullDocumentType> = [];

    for (const doc of documents) {
      // Extract _id from document if present
      const { _id, ...documentWithoutId } = doc as { _id?: string; [key: string]: unknown };

      // Validate _id if provided
      if (typeof _id !== 'undefined') {
        throwOnIdWithSeparator(_id);
      }

      // Process ID and document based on space
      let processedId: string | undefined = _id;
      let processedDocument: FullDocumentType;

      if (space !== undefined) {
        // Space-aware mode: prefix ID and decorate document (including 'default' space)
        processedId = generateSpacePrefixedId(space, _id);
        processedDocument = decorateDocumentWithSpace(documentWithoutId as FullDocumentType, space);
      } else {
        // Space-agnostic mode: no prefixing or decoration
        processedDocument = documentWithoutId as FullDocumentType;
      }

      // Add create metadata
      operations.push({
        create: processedId ? { _id: processedId } : {},
      } as api.BulkOperationContainer);

      // Add document
      operations.push(processedDocument);
    }

    return this.client.bulk<FullDocumentType>({
      index: this.dataStreamDefinition.name,
      ...restArgs,
      operations,
    });
  }

  public async exists() {
    return this.client.indices.exists({
      index: this.dataStreamDefinition.name,
    });
  }

  public search<Agg extends Record<string, api.AggregationsAggregate> = {}>(
    args: ClientSearchRequest<SRM> & { space: string },
    transportOpts?: TransportRequestOptionsWithOutMeta
  ): Promise<api.SearchResponse<SpaceAwareDocument<FullDocumentType>, Agg>>;

  public search<Agg extends Record<string, api.AggregationsAggregate> = {}>(
    args: ClientSearchRequest<SRM> & { space?: undefined },
    transportOpts?: TransportRequestOptionsWithOutMeta
  ): Promise<api.SearchResponse<FullDocumentType, Agg>>;

  public async search<Agg extends Record<string, api.AggregationsAggregate> = {}>(
    args: ClientSearchRequest<SRM>,
    transportOpts?: TransportRequestOptionsWithOutMeta
  ): Promise<api.SearchResponse<SpaceAwareDocument<FullDocumentType> | FullDocumentType, Agg>> {
    const { space: rawSpace, query, ...restArgs } = args;
    const space = rawSpace === '' ? DEFAULT_SPACE : rawSpace;

    // Build the space-aware query
    const spaceQuery = this.buildSpaceAwareQuery(query, space);
    return this.client.search<SpaceAwareDocument<FullDocumentType> | FullDocumentType, Agg>(
      {
        index: this.dataStreamDefinition.name,
        runtime_mappings: this.dataStreamDefinition.searchRuntimeMappings,
        fields: this.runtimeFields,
        ...restArgs,
        query: spaceQuery,
      },
      transportOpts
    );
  }

  /**
   * Build a space-aware query by wrapping the original query with space filtering.
   * All named spaces (including 'default') filter strictly by kibana.space_ids.
   * When space is undefined, only space-agnostic documents (no kibana.space_ids) are returned.
   */
  private buildSpaceAwareQuery(
    originalQuery?: api.QueryDslQueryContainer,
    space?: string
  ): api.QueryDslQueryContainer {
    const filter = space !== undefined ? buildSpaceFilter(space) : buildSpaceAgnosticFilter();
    if (originalQuery) {
      return { bool: { must: [originalQuery], filter: [filter] } };
    }
    return filter;
  }
}
