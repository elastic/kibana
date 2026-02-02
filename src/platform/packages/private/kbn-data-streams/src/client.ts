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
  ClientGetRequest,
  ClientBulkOperation,
} from './types/es_api';

import { initialize } from './initialize';
import { validateClientArgs } from './validate_client_args';
import {
  generateSpacePrefixedId,
  rejectSpacePrefixedId,
  validateSpaceInId,
  decorateDocumentWithSpace,
  buildSpaceFilter,
  buildSpaceAgnosticFilter,
  SYSTEM_SPACE_PROPERTY,
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

    if (space !== undefined) {
      // Space-aware mode: prefix ID and decorate document
      processedId = generateSpacePrefixedId(space, id);
      if (document) {
        processedDocument = decorateDocumentWithSpace(document, space);
      }
    } else if (id !== undefined) {
      // Space-agnostic mode: reject IDs containing the space separator
      rejectSpacePrefixedId(id);
    }

    return this.client.index<FullDocumentType>({
      ...restArgs,
      id: processedId,
      document: processedDocument,
      index: this.dataStreamDefinition.name,
    });
  }

  public async bulk(args: ClientBulkRequest<FullDocumentType>) {
    const { space, operations, ...restArgs } = args;

    const processedOperations: ClientBulkRequest<FullDocumentType>['operations'] = [];

    for (let i = 0; i < operations.length; i++) {
      const item = operations[i];

      // Check if this is an action metadata object
      if (this.isBulkActionMetadata(item)) {
        processedOperations.push(this.processActionMetadata(item, space));

        // For create/index, the next item is the document body
        if ((item.create || item.index) && i + 1 < operations.length) {
          const doc = operations[++i];
          processedOperations.push(
            space !== undefined ? decorateDocumentWithSpace(doc as FullDocumentType, space) : doc
          );
        }
      } else {
        // Document body or update action payload
        processedOperations.push(item);
      }
    }

    return this.client.bulk<FullDocumentType>({
      index: this.dataStreamDefinition.name,
      ...restArgs,
      operations: processedOperations,
    });
  }

  /** Check if an item is a bulk action metadata object (create, index, update, delete). */
  private isBulkActionMetadata(item: unknown): item is ClientBulkOperation {
    if (!item || typeof item !== 'object') return false;
    const op = item as ClientBulkOperation;
    return !!(op.index || op.create || op.update || op.delete);
  }

  /** Process bulk action metadata: prefix IDs for create/index, validate IDs for update/delete. */
  private processActionMetadata(
    action: ClientBulkOperation,
    space: string | undefined
  ): ClientBulkOperation {
    if (action.create || action.index) {
      const op = action.create ?? action.index!;
      const key = action.create ? 'create' : 'index';
      const { _id, ...rest } = op;

      if (space !== undefined) {
        return { [key]: { ...rest, _id: generateSpacePrefixedId(space, _id) } };
      }
      if (_id !== undefined) rejectSpacePrefixedId(_id);
      return action;
    }

    if (action.update || action.delete) {
      const op = action.update ?? action.delete!;
      const { _id } = op;

      if (_id === undefined) {
        throw new Error(`${action.update ? 'Update' : 'Delete'} operation requires an _id`);
      }
      if (space !== undefined) {
        validateSpaceInId(_id, space);
      } else {
        rejectSpacePrefixedId(_id);
      }
      return action;
    }

    return action;
  }

  public async get(args: ClientGetRequest) {
    const { space, id, ...restArgs } = args;

    if (space !== undefined) {
      // Space-aware mode: validate that ID belongs to the expected space
      validateSpaceInId(id, space);
    } else {
      // Space-agnostic mode: reject space-prefixed IDs
      rejectSpacePrefixedId(id);
    }

    const response = await this.client.get<FullDocumentType>({
      index: this.dataStreamDefinition.name,
      id,
      ...restArgs,
    });

    // Strip kibana.space_ids from the response if space was provided
    if (space !== undefined && response._source) {
      return {
        ...response,
        _source: this.stripSpaceProperty(response._source),
      };
    }

    return response;
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
    if (space !== undefined && response.hits?.hits) {
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
    originalQuery: api.QueryDslQueryContainer | undefined,
    space: string | undefined
  ): api.QueryDslQueryContainer {
    if (space !== undefined) {
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
  private stripSpaceProperty(doc: FullDocumentType | undefined): FullDocumentType | undefined {
    if (!doc || typeof doc !== 'object') return doc;
    const { [SYSTEM_SPACE_PROPERTY]: _, ...rest } = doc as Record<string, unknown>;
    return rest as FullDocumentType;
  }
}
