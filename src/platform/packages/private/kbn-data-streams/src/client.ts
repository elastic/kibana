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
import type {
  ClientSearchRequest,
  ClientIndexRequest,
  ClientBulkRequest,
  ClientBulkOperation,
} from './types/es_api';

import { initialize } from './initialize';
import { validateClientArgs } from './validate_client_args';
import {
  generateSpacePrefixedId,
  throwOnIdWithSeparator,
  decorateDocumentWithSpace,
  buildSpaceFilter,
  buildSpaceAgnosticFilter,
} from './space_utils';

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

  public async index(args: ClientIndexRequest<FullDocumentType>) {
    const { space, document, id, ...restArgs } = args;

    let processedId: string | undefined = id;
    let processedDocument = document;

    // Validate that user-provided IDs don't contain the separator (applies to both modes)
    if (typeof id !== 'undefined') {
      throwOnIdWithSeparator(id);
    }

    if (typeof space !== 'undefined') {
      // Space-aware mode: prefix ID and decorate document
      processedId = generateSpacePrefixedId(space, id);
      if (document) {
        processedDocument = decorateDocumentWithSpace(document, space);
      }
    }

    return this.client.index<FullDocumentType>({
      ...restArgs,
      ...(processedId && { id: processedId }),
      document: processedDocument,
      index: this.dataStreamDefinition.name,
      // Data streams only support op_type: 'create'
      op_type: 'create',
    });
  }

  public async bulk(args: ClientBulkRequest<FullDocumentType>) {
    const { space, operations, ...restArgs } = args;

    const processedOperations = operations.map((metadataOrDocument) => {
      if (this.isBulkActionMetadata(metadataOrDocument)) {
        return this.processActionMetadata(metadataOrDocument, space);
      } else {
        if (space) {
          return decorateDocumentWithSpace(metadataOrDocument, space);
        } else {
          return metadataOrDocument;
        }
      }
    });

    return this.client.bulk<FullDocumentType>({
      index: this.dataStreamDefinition.name,
      ...restArgs,
      operations: processedOperations,
    });
  }

  /** Check if an item is a bulk action metadata object (create). */
  private isBulkActionMetadata(item: unknown): item is ClientBulkOperation {
    if (!item || typeof item !== 'object') return false;
    const op = item as ClientBulkOperation;
    return !!op.create;
  }

  /** Process bulk action metadata: prefix IDs for create operations. */
  private processActionMetadata(
    action: ClientBulkOperation,
    space: string | undefined
  ): ClientBulkOperation {
    const [key, metadata] = Object.entries(action).shift()!;
    const { _id, ...rest } = metadata as { _id?: string; [key: string]: unknown };

    if (key === 'create') {
      // Validate that user-provided IDs don't contain the separator
      if (typeof _id !== 'undefined') {
        throwOnIdWithSeparator(_id);
      }
      if (space) {
        // When space is provided, prefix the ID (or generate one if not provided)
        return { create: { ...rest, _id: generateSpacePrefixedId(space, _id) } };
      } else {
        // When space is not provided, no prefixing
        return action;
      }
    }

    throw new Error(`Unknown operation: '${key}'`);
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
    if (space && response.hits?.hits) {
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

  /**
   * Build a space-aware query by wrapping the original query with space filtering.
   */
  private buildSpaceAwareQuery(
    originalQuery?: api.QueryDslQueryContainer,
    space?: string
  ): api.QueryDslQueryContainer {
    if (space) {
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
