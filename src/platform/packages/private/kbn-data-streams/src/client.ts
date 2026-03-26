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
import type { ClientSearchRequest, ClientCreateRequest } from './types/es_api';

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
    const { space, documents, ...restArgs } = args;

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

      if (this.isNonDefaultSpace(space)) {
        // Space-aware mode: prefix ID and decorate document
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

  public async search<Agg extends Record<string, api.AggregationsAggregate> = {}>(
    args: ClientSearchRequest<SRM>,
    transportOpts?: TransportRequestOptionsWithOutMeta
  ) {
    const { space, query, ...restArgs } = args;

    // Build the space-aware query
    const spaceQuery = this.buildSpaceAwareQuery(query, space);
    const response = await this.client.search<FullDocumentType, Agg>(
      {
        index: this.dataStreamDefinition.name,
        runtime_mappings: this.dataStreamDefinition.searchRuntimeMappings,
        fields: this.runtimeFields,
        ...restArgs,
        query: spaceQuery,
      },
      transportOpts
    );

    // Strip kibana.space_ids from all hits if space was provided
    if (this.isNonDefaultSpace(space) && response.hits?.hits) {
      return {
        ...response,
        hits: {
          ...response.hits,
          hits: response.hits.hits.map((hit) => ({
            ...hit,
            _source: this.stripSpaceProperty(hit._source),
          })),
        },
      };
    }

    return response;
  }

  private isNonDefaultSpace(space?: string): space is string {
    return typeof space !== 'undefined' && space !== DEFAULT_SPACE;
  }

  /**
   * Build a space-aware query by wrapping the original query with space filtering.
   */
  private buildSpaceAwareQuery(
    originalQuery?: api.QueryDslQueryContainer,
    space?: string
  ): api.QueryDslQueryContainer {
    if (this.isNonDefaultSpace(space)) {
      // Space-aware mode: filter to only documents in this space
      const spaceFilter = buildSpaceFilter(space);
      if (originalQuery) {
        return {
          bool: {
            must: [originalQuery],
            filter: [spaceFilter],
          },
        };
      }
      return spaceFilter;
    } else {
      // Space-agnostic mode: exclude documents that have kibana.space_ids
      const agnosticFilter = buildSpaceAgnosticFilter();
      if (originalQuery) {
        return {
          bool: {
            must: [originalQuery],
            filter: [agnosticFilter],
          },
        };
      }
      return agnosticFilter;
    }
  }

  /**
   * Remove kibana.space_ids from document before returning to caller.
   */
  private stripSpaceProperty(doc?: FullDocumentType): FullDocumentType | undefined {
    if (typeof doc !== 'object') {
      return doc;
    }
    const { kibana, ...rest } = doc as Record<string, unknown>;
    return rest as FullDocumentType;
  }
}
