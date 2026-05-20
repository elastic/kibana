import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, StorageDocumentOf, InternalIStorageClient } from '../..';
export interface StorageIndexAdapterOptions<TApplicationType> {
    /**
     * If this callback is provided, it will be called on every _source before returned to the caller of the search or get methods.
     * This is useful for migrating documents from one version to another, or for transforming the document before returning it.
     * This should be used as rarely as possible - in most cases, new properties should be added as optional.
     */
    migrateSource?: (document: Record<string, unknown>) => TApplicationType;
    /**
     * When true, index settings (e.g. `number_of_shards`, `auto_expand_replicas`)
     * are omitted from index templates because Serverless ES does not support them
     * on user-visible indices.
     *
     * Detection is three-tiered:
     * 1. Explicit - this option is used when provided.
     * 2. Proactive - `esClient.info()` is called to check `build_flavor`.
     * 3. Reactive - if both above are unavailable, the adapter catches
     *    the `illegal_argument_exception` on the first write and retries.
     */
    isServerless?: boolean;
}
/**
 * Adapter for writing and reading documents to/from Elasticsearch,
 * using plain indices.
 *
 * Index management is lazy — no resources are created at construction time.
 *
 * - **Writes** (`index`, `bulk`): ensure the index template, backing index,
 *   and mappings all exist and are up-to-date before executing.
 * - **Reads** (`search`, `get`): ensure mappings are up-to-date before
 *   executing.
 *
 * Mapping updates are applied in-place via `putMapping` on the existing
 * write index — no rollover is performed. This supports additive schema
 * changes (new fields, new sub-fields) but not incompatible ones
 * (type changes, field removal).
 *
 * TODO:
 * - Schema upgrades w/ fallbacks (rollover + reindex for incompatible changes)
 */
export declare class StorageIndexAdapter<TStorageSettings extends IndexStorageSettings, TApplicationType extends Partial<StorageDocumentOf<TStorageSettings>>> {
    private readonly esClient;
    private readonly storage;
    private readonly options;
    private static readonly INDEX_SETTINGS;
    private readonly logger;
    private updateMappingsPromise;
    private serverlessCheck;
    private isServerless;
    constructor(esClient: ElasticsearchClient, logger: Logger, storage: TStorageSettings, options?: StorageIndexAdapterOptions<TApplicationType>);
    /**
     * Probes the ES cluster via `info()` to determine if we're running
     * against Serverless ES. The result is cached for the lifetime of
     * this adapter instance. Returns `undefined` when the check cannot
     * be performed (e.g. missing method on a mock client, or
     * insufficient privileges).
     */
    private detectServerless;
    private getSearchIndexPattern;
    private getWriteTarget;
    private createOrUpdateIndexTemplate;
    private getExistingIndexTemplate;
    private getCurrentWriteIndex;
    private getExistingIndices;
    private getCurrentWriteIndexName;
    private createIndex;
    private updateMappingsOfExistingIndex;
    /**
     * If a write index already exists and its mappings are stale,
     * updates the index template and pushes the new mappings.
     * No-op when no index exists yet (preserving lazy-write semantics)
     * or when mappings are already up-to-date.
     */
    private updateMappingsIfNeeded;
    /**
     * Validates whether:
     * - an index template exists
     * - the index template has the right version (if not, update it)
     * - the index exists (if it doesn't, create it)
     * - the index has the right version (if not, update it)
     */
    private validateComponentsBeforeWriting;
    private ensureMappingsBeforeReading;
    private search;
    private index;
    private bulk;
    private clean;
    private delete;
    private get;
    private maybeMigrateSource;
    /**
     * Checks whether the backing index exists. No mapping
     * reconciliation is performed.
     */
    private existsIndex;
    getClient(): InternalIStorageClient<TApplicationType>;
}
export type SimpleStorageIndexAdapter<TStorageSettings extends IndexStorageSettings> = StorageIndexAdapter<TStorageSettings, StorageDocumentOf<TStorageSettings>>;
