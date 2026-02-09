/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  BulkOperationContainer,
  BulkOperationType,
  IndexResponse,
  IndicesIndexState,
  IndicesIndexTemplate,
  IndicesPutIndexTemplateIndexTemplateMapping,
  MappingProperty,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { last, mapValues, padStart } from 'lodash';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type {
  IndexStorageSettings,
  StorageClientBulkResponse,
  StorageClientDeleteResponse,
  StorageClientBulk,
  StorageClientDelete,
  StorageClientIndex,
  StorageClientIndexResponse,
  StorageClientSearch,
  StorageClientGet,
  StorageClientExistsIndex,
  StorageDocumentOf,
  StorageClientSearchResponse,
  StorageClientClean,
  StorageClientCleanResponse,
  InternalIStorageClient,
} from '../..';
import { getSchemaVersion } from '../get_schema_version';
import type { StorageMappingProperty } from '../../types';
import { BulkOperationError } from '../errors';

function getAliasName(name: string) {
  return name;
}

function getIndexPattern(name: string) {
  return `${name}-*`;
}

/** Creates names like: .my-index-0000001 */
function getIndexName(name: string, count: number) {
  const countId = padStart(count.toString(), 6, '0');
  return `${name}-${countId}`;
}

function getIndexTemplateName(name: string) {
  return `${name}`;
}

// TODO: this function is here to strip properties when we add back optional/multi-value
// which should be implemented in pipelines
function toElasticsearchMappingProperty(property: StorageMappingProperty): MappingProperty {
  return property;
}

function catchConflictError(error: Error) {
  if (
    isResponseError(error) &&
    error.statusCode === 400 &&
    error.body?.error?.type === 'resource_already_exists_exception'
  ) {
    return;
  }
  throw error;
}

function isNotFoundError(error: Error): error is errors.ResponseError & { statusCode: 404 } {
  return isResponseError(error) && error.statusCode === 404;
}

/*
 * When calling into Elasticsearch, the stack trace is lost.
 * If we create an error before calling, and append it to
 * any stack of the caught error, we get a more useful stack
 * trace.
 */
function wrapEsCall<T>(p: Promise<T>): Promise<T> {
  const error = new Error();
  return p.catch((caughtError) => {
    caughtError.stack += error.stack;
    throw caughtError;
  });
}

export interface StorageIndexAdapterOptions<TApplicationType> {
  /**
   * If this callback is provided, it will be called on every _source before returned to the caller of the search or get methods.
   * This is useful for migrating documents from one version to another, or for transforming the document before returning it.
   * This should be used as rarely as possible - in most cases, new properties should be added as optional.
   */
  migrateSource?: (document: Record<string, unknown>) => TApplicationType;
}

/**
 * Adapter for writing and reading documents to/from Elasticsearch,
 * using plain indices.
 *
 * TODO:
 * - Schema upgrades w/ fallbacks
 */
export class StorageIndexAdapter<
  TStorageSettings extends IndexStorageSettings,
  TApplicationType extends Partial<StorageDocumentOf<TStorageSettings>>
> {
  private readonly logger: Logger;
  constructor(
    private readonly esClient: ElasticsearchClient,
    logger: Logger,
    private readonly storage: TStorageSettings,
    private readonly options: StorageIndexAdapterOptions<TApplicationType> = {}
  ) {
    this.logger = logger.get('storage').get(this.storage.name);
  }

  private getSearchIndexPattern(): string {
    return `${getAliasName(this.storage.name)}`;
  }

  private getWriteTarget(): string {
    return getAliasName(this.storage.name);
  }

  private async createOrUpdateIndexTemplate(): Promise<void> {
    const version = getSchemaVersion(this.storage);

    const template: IndicesPutIndexTemplateIndexTemplateMapping = {
      mappings: {
        _meta: {
          version,
        },
        dynamic: 'strict',
        properties: {
          ...mapValues(this.storage.schema.properties, toElasticsearchMappingProperty),
        },
      },
      aliases: {
        [getAliasName(this.storage.name)]: {
          is_write_index: true,
        },
      },
    };

    await wrapEsCall(
      this.esClient.indices.putIndexTemplate({
        name: getIndexTemplateName(this.storage.name),
        create: false,
        allow_auto_create: false,
        index_patterns: getIndexPattern(this.storage.name),
        _meta: {
          version,
        },
        template,
      })
    ).catch(catchConflictError);
  }

  private async getExistingIndexTemplate(): Promise<IndicesIndexTemplate | undefined> {
    return await wrapEsCall(
      this.esClient.indices.getIndexTemplate({
        name: getIndexTemplateName(this.storage.name),
      })
    )
      .then((templates) => templates.index_templates[0]?.index_template)
      .catch((error) => {
        if (isNotFoundError(error)) {
          return undefined;
        }
        throw error;
      });
  }

  private async getCurrentWriteIndex(): Promise<
    { name: string; state: IndicesIndexState } | undefined
  > {
    const [writeIndex, indices] = await Promise.all([
      this.getCurrentWriteIndexName(),
      this.getExistingIndices(),
    ]);

    return writeIndex ? { name: writeIndex, state: indices[writeIndex] } : undefined;
  }

  private async getExistingIndices() {
    return wrapEsCall(
      this.esClient.indices.get({
        index: getIndexPattern(this.storage.name),
        allow_no_indices: true,
      })
    );
  }

  private async getCurrentWriteIndexName(): Promise<string | undefined> {
    const aliasName = getAliasName(this.storage.name);

    const aliases = await wrapEsCall(
      this.esClient.indices.getAlias({
        name: getAliasName(this.storage.name),
      })
    ).catch((error) => {
      if (isResponseError(error) && error.statusCode === 404) {
        return {};
      }
      throw error;
    });

    const writeIndex = Object.entries(aliases)
      .map(([name, alias]) => {
        return {
          name,
          isWriteIndex: alias.aliases[aliasName]?.is_write_index === true,
        };
      })
      .find(({ isWriteIndex }) => {
        return isWriteIndex;
      });

    return writeIndex?.name;
  }

  private async createIndex(): Promise<void> {
    const writeIndex = await this.getCurrentWriteIndexName();

    const indexName = getIndexName(
      this.storage.name,
      writeIndex ? parseInt(last(writeIndex.split('-'))!, 10) : 1
    );

    await wrapEsCall(
      this.esClient.indices.create({
        index: indexName,
      })
    ).catch(catchConflictError);
  }

  private async updateMappingsOfExistingIndex({ name }: { name: string }) {
    const simulateIndexTemplateResponse = await this.esClient.indices.simulateIndexTemplate({
      name: getIndexName(this.storage.name, 999999),
    });

    if (simulateIndexTemplateResponse.template.mappings) {
      await this.esClient.indices.putMapping({
        index: name,
        ...simulateIndexTemplateResponse.template.mappings,
      });
    }
  }

  /**
   * Validates whether:
   * - an index template exists
   * - the index template has the right version (if not, update it)
   * - the index exists (if it doesn't, create it)
   * - the index has the right version (if not, update it)
   */
  private async validateComponentsBeforeWriting<T>(cb: () => Promise<T>): Promise<T> {
    const expectedSchemaVersion = getSchemaVersion(this.storage);
    await this.createOrUpdateIndexTemplate();

    const writeIndex = await this.getCurrentWriteIndex();
    if (!writeIndex) {
      this.logger.debug(`Creating index`);
      await this.createIndex();
    } else if (writeIndex?.state.mappings?._meta?.version !== expectedSchemaVersion) {
      this.logger.debug(`Updating mappings of existing index due to schema version mismatch`);
      await this.updateMappingsOfExistingIndex({
        name: writeIndex.name,
      });
    }

    return await cb();
  }

  private search: StorageClientSearch<TApplicationType> = async (request) => {
    return (await wrapEsCall(
      this.esClient
        .search({
          ...request,
          index: this.getSearchIndexPattern(),
          allow_no_indices: true,
        })
        .then((response) => {
          return {
            ...response,
            hits: {
              ...response.hits,
              hits: response.hits.hits.map((hit) => ({
                ...hit,
                _source: this.maybeMigrateSource(hit._source),
              })),
            },
          };
        })
        .catch((error): StorageClientSearchResponse<TApplicationType, any> => {
          if (isNotFoundError(error)) {
            return {
              _shards: {
                failed: 0,
                successful: 0,
                total: 0,
              },
              hits: {
                hits: [],
                total: {
                  relation: 'eq',
                  value: 0,
                },
              },
              timed_out: false,
              took: 0,
            };
          }
          throw error;
        })
    )) as unknown as ReturnType<StorageClientSearch<TApplicationType>>;
  };

  private index: StorageClientIndex<TApplicationType> = async ({
    id,
    refresh = 'wait_for',
    ...request
  }): Promise<StorageClientIndexResponse> => {
    const attemptIndex = async (): Promise<IndexResponse> => {
      const indexResponse = await wrapEsCall(
        this.esClient.index({
          ...request,
          id,
          refresh,
          index: this.getWriteTarget(),
          require_alias: true,
        })
      );

      return indexResponse;
    };

    return this.validateComponentsBeforeWriting(attemptIndex).then(async (response) => {
      this.logger.debug(() => `Indexed document ${id} into ${response._index}`);

      return response;
    });
  };

  private bulk: StorageClientBulk<TApplicationType> = ({
    operations,
    refresh = 'wait_for',
    throwOnFail = false,
    ...request
  }): Promise<StorageClientBulkResponse> => {
    if (operations.length === 0) {
      this.logger.debug(`Bulk request with 0 operations is a noop`);
      return Promise.resolve({
        errors: false,
        items: [],
        took: 0,
        ingest_took: 0,
      });
    }

    this.logger.debug(`Processing ${operations.length} bulk operations`);

    const bulkOperations = operations.flatMap((operation): BulkOperationContainer[] => {
      if ('index' in operation) {
        return [
          {
            index: {
              _id: operation.index._id,
            },
          },
          operation.index.document as {},
        ];
      }

      return [operation];
    });

    const attemptBulk = async () => {
      return wrapEsCall(
        this.esClient.bulk({
          ...request,
          refresh,
          operations: bulkOperations,
          index: this.getWriteTarget(),
          require_alias: true,
        })
      );
    };

    return this.validateComponentsBeforeWriting(attemptBulk).then(async (response) => {
      // Check for errors and throw if throwOnFail is true
      if (throwOnFail) {
        const erroredItems = response.items.filter((item) => {
          const operation = Object.keys(item)[0] as BulkOperationType;
          return item[operation]?.error;
        });
        if (erroredItems.length > 0) {
          throw new BulkOperationError(
            `Bulk operation failed for ${erroredItems.length} out of ${
              response.items.length
            } items: ${JSON.stringify(erroredItems)}`,
            response
          );
        }
      }
      return response;
    });
  };

  private clean: StorageClientClean = async (): Promise<StorageClientCleanResponse> => {
    const allIndices = await this.getExistingIndices();
    const hasIndices = Object.keys(allIndices).length > 0;
    // Delete all indices
    await Promise.all(
      Object.keys(allIndices).map((index) =>
        wrapEsCall(
          this.esClient.indices.delete({
            index,
          })
        )
      )
    );
    // Delete the index template
    const template = await this.getExistingIndexTemplate();
    const hasTemplate = !!template;
    if (template) {
      await wrapEsCall(
        this.esClient.indices.deleteIndexTemplate({
          name: getIndexTemplateName(this.storage.name),
        })
      );
    }

    return {
      acknowledged: true,
      result: hasIndices || hasTemplate ? 'deleted' : 'noop',
    };
  };

  private delete: StorageClientDelete = async ({
    id,
    refresh = 'wait_for',
    ...request
  }): Promise<StorageClientDeleteResponse> => {
    this.logger.debug(`Deleting document with id ${id}`);
    const searchResponse = await this.search({
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          filter: [
            {
              term: {
                _id: id,
              },
            },
          ],
        },
      },
    });

    const document = searchResponse.hits.hits[0];

    if (document) {
      await wrapEsCall(
        this.esClient.delete({
          ...request,
          refresh,
          id,
          index: document._index,
        })
      );

      return { acknowledged: true, result: 'deleted' };
    }

    return { acknowledged: true, result: 'not_found' };
  };

  private get: StorageClientGet<TApplicationType> = async ({ id, ...request }) => {
    const response = await this.search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [
            {
              term: {
                _id: id,
              },
            },
          ],
        },
      },
      ...request,
    });

    const hit: SearchHit = response.hits.hits[0];

    if (!hit) {
      throw new errors.ResponseError({
        meta: {
          aborted: false,
          attempts: 1,
          connection: null,
          context: null,
          name: 'resource_not_found_exception',
          request: {} as unknown as DiagnosticResult['meta']['request'],
        },
        warnings: [],
        body: 'resource_not_found_exception',
        statusCode: 404,
      });
    }

    return {
      _id: hit._id!,
      _index: hit._index,
      found: true,
      _source: this.maybeMigrateSource(hit._source),
      _ignored: hit._ignored,
      _primary_term: hit._primary_term,
      _routing: hit._routing,
      _seq_no: hit._seq_no,
      _version: hit._version,
      fields: hit.fields,
    };
  };

  private maybeMigrateSource = (_source: unknown): TApplicationType => {
    // check whether source is an object, if not fail
    if (typeof _source !== 'object' || _source === null) {
      throw new Error(`Source must be an object, got ${typeof _source}`);
    }
    if (this.options.migrateSource) {
      return this.options.migrateSource(_source as Record<string, unknown>);
    }
    return _source as TApplicationType;
  };

  private existsIndex: StorageClientExistsIndex = () => {
    return this.esClient.indices.exists({
      index: this.getSearchIndexPattern(),
    });
  };

  getClient(): InternalIStorageClient<TApplicationType> {
    return {
      bulk: this.bulk,
      delete: this.delete,
      clean: this.clean,
      index: this.index,
      search: this.search,
      get: this.get,
      existsIndex: this.existsIndex,
    };
  }
}

export type SimpleStorageIndexAdapter<TStorageSettings extends IndexStorageSettings> =
  StorageIndexAdapter<TStorageSettings, StorageDocumentOf<TStorageSettings>>;
