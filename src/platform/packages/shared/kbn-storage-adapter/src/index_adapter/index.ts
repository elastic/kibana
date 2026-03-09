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
  FieldValue,
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
  StorageClientMigrateDocuments,
  StorageClientMigrateDocumentsOptions,
  StorageClientMigrateDocumentsResponse,
  InternalIStorageClient,
} from '../..';
import { getSchemaVersion } from '../get_schema_version';
import type { StorageMappingProperty } from '../../types';
import { BulkOperationError } from '../errors';
import { VERSION_FIELD, getSchemaPaths, type StorageSchemaVersioning } from '../schema_versioning';

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

function flattenMappingPaths(
  mappings: Record<string, StorageMappingProperty>,
  prefix: string = ''
): string[] {
  return Object.entries(mappings).flatMap(([key, value]) => {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const nested =
      'properties' in value && value.properties
        ? flattenMappingPaths(value.properties as Record<string, StorageMappingProperty>, fullPath)
        : [];
    return [fullPath, ...nested];
  });
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
   * When provided, enables per-document schema versioning.
   *
   * - On write: documents are validated against the latest schema and stamped with the current version.
   * - On read: documents are migrated through the version chain from their persisted version to the latest.
   * - Documents without a version field (legacy) are migrated through the full chain from version 1.
   *
   * Built with `defineVersioning(initialSchema).addVersion({ schema, migrate }).build()`.
   */
  versioning?: StorageSchemaVersioning<TApplicationType>;
}

/**
 * Adapter for writing and reading documents to/from Elasticsearch,
 * using plain indices.
 */
export class StorageIndexAdapter<
  TStorageSettings extends IndexStorageSettings,
  TApplicationType extends Partial<StorageDocumentOf<TStorageSettings>>
> {
  private readonly logger: Logger;
  private readonly schemaVersion: string;
  private initPromise: Promise<void> | undefined;

  constructor(
    private readonly esClient: ElasticsearchClient,
    logger: Logger,
    private readonly storage: TStorageSettings,
    private readonly options: StorageIndexAdapterOptions<TApplicationType> = {}
  ) {
    this.logger = logger.get('storage').get(this.storage.name);
    this.schemaVersion = getSchemaVersion(this.storage);

    if (this.options.versioning) {
      this.validateVersioningSchema(this.options.versioning);
    }
  }

  private validateVersioningSchema(versioning: StorageSchemaVersioning<unknown>): void {
    if (VERSION_FIELD in this.storage.schema.properties) {
      throw new Error(
        `The field "${VERSION_FIELD}" is reserved for schema versioning and must not be defined in the schema properties`
      );
    }

    const schemaPaths = getSchemaPaths(versioning.latestSchema);
    if (!schemaPaths) {
      return;
    }

    const mappingPaths = new Set(flattenMappingPaths(this.storage.schema.properties));
    const missing = schemaPaths.filter((path) => !mappingPaths.has(path));
    if (missing.length > 0) {
      throw new Error(
        `Versioning schema properties [${missing.join(
          ', '
        )}] are not defined in storageSettings.schema.properties`
      );
    }
  }

  /**
   * Ensures the index template, index, and mappings are up-to-date.
   * Runs the full setup once per adapter instance. If the initial setup
   * fails, the next call retries.
   */
  private ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize().catch((error) => {
        this.initPromise = undefined;
        throw error;
      });
    }
    return this.initPromise;
  }

  private async initialize(): Promise<void> {
    await this.createOrUpdateIndexTemplate();

    const writeIndex = await this.getCurrentWriteIndex();
    if (!writeIndex) {
      this.logger.debug(`Creating index`);
      await this.createIndex();
    } else if (this.needsMappingUpdate(writeIndex.state.mappings?._meta)) {
      this.logger.debug(`Updating mappings of existing index due to schema version mismatch`);
      await this.updateMappingsOfExistingIndex({ name: writeIndex.name });
    }
  }

  private getSearchIndexPattern(): string {
    return getAliasName(this.storage.name);
  }

  private getWriteTarget(): string {
    return getAliasName(this.storage.name);
  }

  private async createOrUpdateIndexTemplate(): Promise<void> {
    const properties: Record<string, MappingProperty> = {
      ...mapValues(this.storage.schema.properties, toElasticsearchMappingProperty),
    };

    const meta: Record<string, unknown> = { version: this.schemaVersion };

    if (this.options.versioning) {
      properties[VERSION_FIELD] = { type: 'long' };
      meta.schemaVersion = this.options.versioning.latestVersion;
    }

    const template: IndicesPutIndexTemplateIndexTemplateMapping = {
      mappings: {
        _meta: meta,
        dynamic: 'strict',
        properties,
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
        _meta: meta,
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

  private needsMappingUpdate(indexMeta: Record<string, unknown> | undefined): boolean {
    if (indexMeta?.version !== this.schemaVersion) {
      return true;
    }
    if (
      this.options.versioning &&
      indexMeta?.schemaVersion !== this.options.versioning.latestVersion
    ) {
      return true;
    }
    return false;
  }

  private async validateComponentsBeforeWriting<T>(cb: () => Promise<T>): Promise<T> {
    await this.ensureInitialized();
    try {
      return await cb();
    } catch (error) {
      if (isNotFoundError(error as Error)) {
        this.initPromise = undefined;
        await this.ensureInitialized();
        return await cb();
      }
      throw error;
    }
  }

  private search: StorageClientSearch<TApplicationType> = async (request) => {
    return (await wrapEsCall(
      this.esClient
        .search({
          ...request,
          index: this.getSearchIndexPattern(),
          allow_no_indices: true,
        })
        .then(async (response) => {
          const migratedHits = await Promise.all(
            response.hits.hits.map(async (hit) => ({
              ...hit,
              _source: await this.maybeMigrateSource(hit._source),
            }))
          );
          return {
            ...response,
            hits: {
              ...response.hits,
              hits: migratedHits,
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
    document: userDocument,
    ...request
  }): Promise<StorageClientIndexResponse> => {
    const document = this.prepareDocumentForWrite(userDocument as Record<string, unknown>);

    const attemptIndex = async (): Promise<IndexResponse> => {
      const indexResponse = await wrapEsCall(
        this.esClient.index({
          ...request,
          document,
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
        const document = this.prepareDocumentForWrite(
          operation.index.document as Record<string, unknown>
        );
        return [
          {
            index: {
              _id: operation.index._id,
            },
          },
          document as {},
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
      _source: await this.maybeMigrateSource(hit._source),
      _ignored: hit._ignored,
      _primary_term: hit._primary_term,
      _routing: hit._routing,
      _seq_no: hit._seq_no,
      _version: hit._version,
      fields: hit.fields,
    };
  };

  private prepareDocumentForWrite(document: Record<string, unknown>): Record<string, unknown> {
    if (!this.options.versioning) {
      return document;
    }
    this.options.versioning.latestSchema.parse(document);
    return { ...document, [VERSION_FIELD]: this.options.versioning.latestVersion };
  }

  private maybeMigrateSource = async (_source: unknown): Promise<TApplicationType> => {
    if (typeof _source !== 'object' || _source === null) {
      throw new Error(`Source must be an object, got ${typeof _source}`);
    }

    const source = _source as Record<string, unknown>;

    if (this.options.versioning) {
      const docVersion = source[VERSION_FIELD] as number | undefined;
      const { [VERSION_FIELD]: _, ...docWithoutVersion } = source;

      return docVersion !== undefined
        ? this.options.versioning.migrate(docWithoutVersion, docVersion)
        : this.options.versioning.migrate(docWithoutVersion, 1);
    }

    return source as TApplicationType;
  };

  private existsIndex: StorageClientExistsIndex = () => {
    return this.esClient.indices.exists({
      index: this.getSearchIndexPattern(),
    });
  };

  private migrateDocuments: StorageClientMigrateDocuments = async (
    options?: StorageClientMigrateDocumentsOptions
  ): Promise<StorageClientMigrateDocumentsResponse> => {
    if (!this.options.versioning) {
      return { migrated: 0, total: 0 };
    }

    const { versioning } = this.options;

    await this.ensureInitialized();

    const writeIndex = await this.getCurrentWriteIndex();
    if (!writeIndex) {
      return { migrated: 0, total: 0 };
    }

    let migrated = 0;
    let total = 0;
    const batchSize = options?.batchSize ?? 1000;
    let searchAfter: FieldValue[] | undefined;

    while (true) {
      const response = await wrapEsCall(
        this.esClient.search({
          index: this.getSearchIndexPattern(),
          size: batchSize,
          sort: [{ _id: 'asc' as const }],
          track_total_hits: false,
          ...(searchAfter ? { search_after: searchAfter } : {}),
          query: {
            bool: {
              should: [
                { bool: { must_not: [{ exists: { field: VERSION_FIELD } }] } },
                { range: { [VERSION_FIELD]: { lt: versioning.latestVersion } } },
              ],
              minimum_should_match: 1,
            },
          },
        })
      );

      const hits = response.hits.hits;
      if (hits.length === 0) break;

      total += hits.length;

      const migratedDocs = await Promise.all(
        hits.map(async (hit) => ({
          _id: hit._id!,
          _index: hit._index,
          doc: await this.maybeMigrateSource(hit._source),
        }))
      );

      const operations = migratedDocs.flatMap<BulkOperationContainer>(({ _id, _index, doc }) => [
        { index: { _id, _index } },
        { ...(doc as Record<string, unknown>), [VERSION_FIELD]: versioning.latestVersion } as {},
      ]);

      const bulkResponse = await wrapEsCall(
        this.esClient.bulk({
          operations,
          refresh: false,
        })
      );

      if (bulkResponse.errors) {
        const failedItems = bulkResponse.items.filter((item) => Object.values(item)[0]?.error);
        this.logger.warn(
          `Bulk migration encountered ${failedItems.length} errors in batch of ${hits.length}`
        );
      }
      migrated += hits.length;

      this.logger.debug(`Migrated ${migrated} documents so far`);

      searchAfter = hits.at(-1)!.sort as FieldValue[] | undefined;
    }

    if (migrated > 0) {
      await wrapEsCall(
        this.esClient.indices.refresh({
          index: this.getSearchIndexPattern(),
        })
      );
    }

    return { migrated, total };
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
      migrateDocuments: this.migrateDocuments,
    };
  }
}

export type SimpleStorageIndexAdapter<TStorageSettings extends IndexStorageSettings> =
  StorageIndexAdapter<TStorageSettings, StorageDocumentOf<TStorageSettings>>;
