import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Indices {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Adds a block to an index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/index-modules-blocks.html | Elasticsearch API documentation}
      */
    addBlock(this: That, params: T.IndicesAddBlockRequest | TB.IndicesAddBlockRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesAddBlockResponse>;
    addBlock(this: That, params: T.IndicesAddBlockRequest | TB.IndicesAddBlockRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesAddBlockResponse, unknown>>;
    addBlock(this: That, params: T.IndicesAddBlockRequest | TB.IndicesAddBlockRequest, options?: TransportRequestOptions): Promise<T.IndicesAddBlockResponse>;
    /**
      * Performs analysis on a text string and returns the resulting tokens.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-analyze.html | Elasticsearch API documentation}
      */
    analyze(this: That, params?: T.IndicesAnalyzeRequest | TB.IndicesAnalyzeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesAnalyzeResponse>;
    analyze(this: That, params?: T.IndicesAnalyzeRequest | TB.IndicesAnalyzeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesAnalyzeResponse, unknown>>;
    analyze(this: That, params?: T.IndicesAnalyzeRequest | TB.IndicesAnalyzeRequest, options?: TransportRequestOptions): Promise<T.IndicesAnalyzeResponse>;
    /**
      * Clears the caches of one or more indices. For data streams, the API clears the caches of the stream’s backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-clearcache.html | Elasticsearch API documentation}
      */
    clearCache(this: That, params?: T.IndicesClearCacheRequest | TB.IndicesClearCacheRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesClearCacheResponse>;
    clearCache(this: That, params?: T.IndicesClearCacheRequest | TB.IndicesClearCacheRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesClearCacheResponse, unknown>>;
    clearCache(this: That, params?: T.IndicesClearCacheRequest | TB.IndicesClearCacheRequest, options?: TransportRequestOptions): Promise<T.IndicesClearCacheResponse>;
    /**
      * Clones an existing index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-clone-index.html | Elasticsearch API documentation}
      */
    clone(this: That, params: T.IndicesCloneRequest | TB.IndicesCloneRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesCloneResponse>;
    clone(this: That, params: T.IndicesCloneRequest | TB.IndicesCloneRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesCloneResponse, unknown>>;
    clone(this: That, params: T.IndicesCloneRequest | TB.IndicesCloneRequest, options?: TransportRequestOptions): Promise<T.IndicesCloneResponse>;
    /**
      * Closes an index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-close.html | Elasticsearch API documentation}
      */
    close(this: That, params: T.IndicesCloseRequest | TB.IndicesCloseRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesCloseResponse>;
    close(this: That, params: T.IndicesCloseRequest | TB.IndicesCloseRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesCloseResponse, unknown>>;
    close(this: That, params: T.IndicesCloseRequest | TB.IndicesCloseRequest, options?: TransportRequestOptions): Promise<T.IndicesCloseResponse>;
    /**
      * Creates a new index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-create-index.html | Elasticsearch API documentation}
      */
    create(this: That, params: T.IndicesCreateRequest | TB.IndicesCreateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesCreateResponse>;
    create(this: That, params: T.IndicesCreateRequest | TB.IndicesCreateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesCreateResponse, unknown>>;
    create(this: That, params: T.IndicesCreateRequest | TB.IndicesCreateRequest, options?: TransportRequestOptions): Promise<T.IndicesCreateResponse>;
    /**
      * Creates a data stream. You must have a matching index template with data stream enabled.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/data-streams.html | Elasticsearch API documentation}
      */
    createDataStream(this: That, params: T.IndicesCreateDataStreamRequest | TB.IndicesCreateDataStreamRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesCreateDataStreamResponse>;
    createDataStream(this: That, params: T.IndicesCreateDataStreamRequest | TB.IndicesCreateDataStreamRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesCreateDataStreamResponse, unknown>>;
    createDataStream(this: That, params: T.IndicesCreateDataStreamRequest | TB.IndicesCreateDataStreamRequest, options?: TransportRequestOptions): Promise<T.IndicesCreateDataStreamResponse>;
    /**
      * Retrieves statistics for one or more data streams.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/data-streams.html | Elasticsearch API documentation}
      */
    dataStreamsStats(this: That, params?: T.IndicesDataStreamsStatsRequest | TB.IndicesDataStreamsStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesDataStreamsStatsResponse>;
    dataStreamsStats(this: That, params?: T.IndicesDataStreamsStatsRequest | TB.IndicesDataStreamsStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesDataStreamsStatsResponse, unknown>>;
    dataStreamsStats(this: That, params?: T.IndicesDataStreamsStatsRequest | TB.IndicesDataStreamsStatsRequest, options?: TransportRequestOptions): Promise<T.IndicesDataStreamsStatsResponse>;
    /**
      * Deletes one or more indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-delete-index.html | Elasticsearch API documentation}
      */
    delete(this: That, params: T.IndicesDeleteRequest | TB.IndicesDeleteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesDeleteResponse>;
    delete(this: That, params: T.IndicesDeleteRequest | TB.IndicesDeleteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesDeleteResponse, unknown>>;
    delete(this: That, params: T.IndicesDeleteRequest | TB.IndicesDeleteRequest, options?: TransportRequestOptions): Promise<T.IndicesDeleteResponse>;
    /**
      * Removes a data stream or index from an alias.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-aliases.html | Elasticsearch API documentation}
      */
    deleteAlias(this: That, params: T.IndicesDeleteAliasRequest | TB.IndicesDeleteAliasRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesDeleteAliasResponse>;
    deleteAlias(this: That, params: T.IndicesDeleteAliasRequest | TB.IndicesDeleteAliasRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesDeleteAliasResponse, unknown>>;
    deleteAlias(this: That, params: T.IndicesDeleteAliasRequest | TB.IndicesDeleteAliasRequest, options?: TransportRequestOptions): Promise<T.IndicesDeleteAliasResponse>;
    /**
      * Removes the data lifecycle from a data stream rendering it not managed by the data stream lifecycle
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/data-streams-delete-lifecycle.html | Elasticsearch API documentation}
      */
    deleteDataLifecycle(this: That, params: T.IndicesDeleteDataLifecycleRequest | TB.IndicesDeleteDataLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesDeleteDataLifecycleResponse>;
    deleteDataLifecycle(this: That, params: T.IndicesDeleteDataLifecycleRequest | TB.IndicesDeleteDataLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesDeleteDataLifecycleResponse, unknown>>;
    deleteDataLifecycle(this: That, params: T.IndicesDeleteDataLifecycleRequest | TB.IndicesDeleteDataLifecycleRequest, options?: TransportRequestOptions): Promise<T.IndicesDeleteDataLifecycleResponse>;
    /**
      * Deletes one or more data streams and their backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/data-streams.html | Elasticsearch API documentation}
      */
    deleteDataStream(this: That, params: T.IndicesDeleteDataStreamRequest | TB.IndicesDeleteDataStreamRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesDeleteDataStreamResponse>;
    deleteDataStream(this: That, params: T.IndicesDeleteDataStreamRequest | TB.IndicesDeleteDataStreamRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesDeleteDataStreamResponse, unknown>>;
    deleteDataStream(this: That, params: T.IndicesDeleteDataStreamRequest | TB.IndicesDeleteDataStreamRequest, options?: TransportRequestOptions): Promise<T.IndicesDeleteDataStreamResponse>;
    /**
      * Delete an index template. The provided <index-template> may contain multiple template names separated by a comma. If multiple template names are specified then there is no wildcard support and the provided names should match completely with existing templates.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-delete-template.html | Elasticsearch API documentation}
      */
    deleteIndexTemplate(this: That, params: T.IndicesDeleteIndexTemplateRequest | TB.IndicesDeleteIndexTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesDeleteIndexTemplateResponse>;
    deleteIndexTemplate(this: That, params: T.IndicesDeleteIndexTemplateRequest | TB.IndicesDeleteIndexTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesDeleteIndexTemplateResponse, unknown>>;
    deleteIndexTemplate(this: That, params: T.IndicesDeleteIndexTemplateRequest | TB.IndicesDeleteIndexTemplateRequest, options?: TransportRequestOptions): Promise<T.IndicesDeleteIndexTemplateResponse>;
    /**
      * Deletes a legacy index template.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-delete-template-v1.html | Elasticsearch API documentation}
      */
    deleteTemplate(this: That, params: T.IndicesDeleteTemplateRequest | TB.IndicesDeleteTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesDeleteTemplateResponse>;
    deleteTemplate(this: That, params: T.IndicesDeleteTemplateRequest | TB.IndicesDeleteTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesDeleteTemplateResponse, unknown>>;
    deleteTemplate(this: That, params: T.IndicesDeleteTemplateRequest | TB.IndicesDeleteTemplateRequest, options?: TransportRequestOptions): Promise<T.IndicesDeleteTemplateResponse>;
    /**
      * Analyzes the disk usage of each field of an index or data stream.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-disk-usage.html | Elasticsearch API documentation}
      */
    diskUsage(this: That, params: T.IndicesDiskUsageRequest | TB.IndicesDiskUsageRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesDiskUsageResponse>;
    diskUsage(this: That, params: T.IndicesDiskUsageRequest | TB.IndicesDiskUsageRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesDiskUsageResponse, unknown>>;
    diskUsage(this: That, params: T.IndicesDiskUsageRequest | TB.IndicesDiskUsageRequest, options?: TransportRequestOptions): Promise<T.IndicesDiskUsageResponse>;
    /**
      * Aggregates a time series (TSDS) index and stores pre-computed statistical summaries (`min`, `max`, `sum`, `value_count` and `avg`) for each metric field grouped by a configured time interval.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-downsample-data-stream.html | Elasticsearch API documentation}
      */
    downsample(this: That, params: T.IndicesDownsampleRequest | TB.IndicesDownsampleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesDownsampleResponse>;
    downsample(this: That, params: T.IndicesDownsampleRequest | TB.IndicesDownsampleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesDownsampleResponse, unknown>>;
    downsample(this: That, params: T.IndicesDownsampleRequest | TB.IndicesDownsampleRequest, options?: TransportRequestOptions): Promise<T.IndicesDownsampleResponse>;
    /**
      * Checks if a data stream, index, or alias exists.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-exists.html | Elasticsearch API documentation}
      */
    exists(this: That, params: T.IndicesExistsRequest | TB.IndicesExistsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesExistsResponse>;
    exists(this: That, params: T.IndicesExistsRequest | TB.IndicesExistsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesExistsResponse, unknown>>;
    exists(this: That, params: T.IndicesExistsRequest | TB.IndicesExistsRequest, options?: TransportRequestOptions): Promise<T.IndicesExistsResponse>;
    /**
      * Checks if an alias exists.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-aliases.html | Elasticsearch API documentation}
      */
    existsAlias(this: That, params: T.IndicesExistsAliasRequest | TB.IndicesExistsAliasRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesExistsAliasResponse>;
    existsAlias(this: That, params: T.IndicesExistsAliasRequest | TB.IndicesExistsAliasRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesExistsAliasResponse, unknown>>;
    existsAlias(this: That, params: T.IndicesExistsAliasRequest | TB.IndicesExistsAliasRequest, options?: TransportRequestOptions): Promise<T.IndicesExistsAliasResponse>;
    /**
      * Returns information about whether a particular index template exists.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/index-templates.html | Elasticsearch API documentation}
      */
    existsIndexTemplate(this: That, params: T.IndicesExistsIndexTemplateRequest | TB.IndicesExistsIndexTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesExistsIndexTemplateResponse>;
    existsIndexTemplate(this: That, params: T.IndicesExistsIndexTemplateRequest | TB.IndicesExistsIndexTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesExistsIndexTemplateResponse, unknown>>;
    existsIndexTemplate(this: That, params: T.IndicesExistsIndexTemplateRequest | TB.IndicesExistsIndexTemplateRequest, options?: TransportRequestOptions): Promise<T.IndicesExistsIndexTemplateResponse>;
    /**
      * Check existence of index templates. Returns information about whether a particular index template exists.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-template-exists-v1.html | Elasticsearch API documentation}
      */
    existsTemplate(this: That, params: T.IndicesExistsTemplateRequest | TB.IndicesExistsTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesExistsTemplateResponse>;
    existsTemplate(this: That, params: T.IndicesExistsTemplateRequest | TB.IndicesExistsTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesExistsTemplateResponse, unknown>>;
    existsTemplate(this: That, params: T.IndicesExistsTemplateRequest | TB.IndicesExistsTemplateRequest, options?: TransportRequestOptions): Promise<T.IndicesExistsTemplateResponse>;
    /**
      * Retrieves information about the index's current data stream lifecycle, such as any potential encountered error, time since creation etc.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/data-streams-explain-lifecycle.html | Elasticsearch API documentation}
      */
    explainDataLifecycle(this: That, params: T.IndicesExplainDataLifecycleRequest | TB.IndicesExplainDataLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesExplainDataLifecycleResponse>;
    explainDataLifecycle(this: That, params: T.IndicesExplainDataLifecycleRequest | TB.IndicesExplainDataLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesExplainDataLifecycleResponse, unknown>>;
    explainDataLifecycle(this: That, params: T.IndicesExplainDataLifecycleRequest | TB.IndicesExplainDataLifecycleRequest, options?: TransportRequestOptions): Promise<T.IndicesExplainDataLifecycleResponse>;
    /**
      * Returns field usage information for each shard and field of an index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/field-usage-stats.html | Elasticsearch API documentation}
      */
    fieldUsageStats(this: That, params: T.IndicesFieldUsageStatsRequest | TB.IndicesFieldUsageStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesFieldUsageStatsResponse>;
    fieldUsageStats(this: That, params: T.IndicesFieldUsageStatsRequest | TB.IndicesFieldUsageStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesFieldUsageStatsResponse, unknown>>;
    fieldUsageStats(this: That, params: T.IndicesFieldUsageStatsRequest | TB.IndicesFieldUsageStatsRequest, options?: TransportRequestOptions): Promise<T.IndicesFieldUsageStatsResponse>;
    /**
      * Flushes one or more data streams or indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-flush.html | Elasticsearch API documentation}
      */
    flush(this: That, params?: T.IndicesFlushRequest | TB.IndicesFlushRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesFlushResponse>;
    flush(this: That, params?: T.IndicesFlushRequest | TB.IndicesFlushRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesFlushResponse, unknown>>;
    flush(this: That, params?: T.IndicesFlushRequest | TB.IndicesFlushRequest, options?: TransportRequestOptions): Promise<T.IndicesFlushResponse>;
    /**
      * Performs the force merge operation on one or more indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-forcemerge.html | Elasticsearch API documentation}
      */
    forcemerge(this: That, params?: T.IndicesForcemergeRequest | TB.IndicesForcemergeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesForcemergeResponse>;
    forcemerge(this: That, params?: T.IndicesForcemergeRequest | TB.IndicesForcemergeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesForcemergeResponse, unknown>>;
    forcemerge(this: That, params?: T.IndicesForcemergeRequest | TB.IndicesForcemergeRequest, options?: TransportRequestOptions): Promise<T.IndicesForcemergeResponse>;
    /**
      * Returns information about one or more indices. For data streams, the API returns information about the stream’s backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-get-index.html | Elasticsearch API documentation}
      */
    get(this: That, params: T.IndicesGetRequest | TB.IndicesGetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesGetResponse>;
    get(this: That, params: T.IndicesGetRequest | TB.IndicesGetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesGetResponse, unknown>>;
    get(this: That, params: T.IndicesGetRequest | TB.IndicesGetRequest, options?: TransportRequestOptions): Promise<T.IndicesGetResponse>;
    /**
      * Retrieves information for one or more aliases.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-aliases.html | Elasticsearch API documentation}
      */
    getAlias(this: That, params?: T.IndicesGetAliasRequest | TB.IndicesGetAliasRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesGetAliasResponse>;
    getAlias(this: That, params?: T.IndicesGetAliasRequest | TB.IndicesGetAliasRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesGetAliasResponse, unknown>>;
    getAlias(this: That, params?: T.IndicesGetAliasRequest | TB.IndicesGetAliasRequest, options?: TransportRequestOptions): Promise<T.IndicesGetAliasResponse>;
    /**
      * Retrieves the data stream lifecycle configuration of one or more data streams.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/data-streams-get-lifecycle.html | Elasticsearch API documentation}
      */
    getDataLifecycle(this: That, params: T.IndicesGetDataLifecycleRequest | TB.IndicesGetDataLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesGetDataLifecycleResponse>;
    getDataLifecycle(this: That, params: T.IndicesGetDataLifecycleRequest | TB.IndicesGetDataLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesGetDataLifecycleResponse, unknown>>;
    getDataLifecycle(this: That, params: T.IndicesGetDataLifecycleRequest | TB.IndicesGetDataLifecycleRequest, options?: TransportRequestOptions): Promise<T.IndicesGetDataLifecycleResponse>;
    /**
      * Retrieves information about one or more data streams.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/data-streams.html | Elasticsearch API documentation}
      */
    getDataStream(this: That, params?: T.IndicesGetDataStreamRequest | TB.IndicesGetDataStreamRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesGetDataStreamResponse>;
    getDataStream(this: That, params?: T.IndicesGetDataStreamRequest | TB.IndicesGetDataStreamRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesGetDataStreamResponse, unknown>>;
    getDataStream(this: That, params?: T.IndicesGetDataStreamRequest | TB.IndicesGetDataStreamRequest, options?: TransportRequestOptions): Promise<T.IndicesGetDataStreamResponse>;
    /**
      * Retrieves mapping definitions for one or more fields. For data streams, the API retrieves field mappings for the stream’s backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-get-field-mapping.html | Elasticsearch API documentation}
      */
    getFieldMapping(this: That, params: T.IndicesGetFieldMappingRequest | TB.IndicesGetFieldMappingRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesGetFieldMappingResponse>;
    getFieldMapping(this: That, params: T.IndicesGetFieldMappingRequest | TB.IndicesGetFieldMappingRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesGetFieldMappingResponse, unknown>>;
    getFieldMapping(this: That, params: T.IndicesGetFieldMappingRequest | TB.IndicesGetFieldMappingRequest, options?: TransportRequestOptions): Promise<T.IndicesGetFieldMappingResponse>;
    /**
      * Get index templates. Returns information about one or more index templates.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-get-template.html | Elasticsearch API documentation}
      */
    getIndexTemplate(this: That, params?: T.IndicesGetIndexTemplateRequest | TB.IndicesGetIndexTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesGetIndexTemplateResponse>;
    getIndexTemplate(this: That, params?: T.IndicesGetIndexTemplateRequest | TB.IndicesGetIndexTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesGetIndexTemplateResponse, unknown>>;
    getIndexTemplate(this: That, params?: T.IndicesGetIndexTemplateRequest | TB.IndicesGetIndexTemplateRequest, options?: TransportRequestOptions): Promise<T.IndicesGetIndexTemplateResponse>;
    /**
      * Retrieves mapping definitions for one or more indices. For data streams, the API retrieves mappings for the stream’s backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-get-mapping.html | Elasticsearch API documentation}
      */
    getMapping(this: That, params?: T.IndicesGetMappingRequest | TB.IndicesGetMappingRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesGetMappingResponse>;
    getMapping(this: That, params?: T.IndicesGetMappingRequest | TB.IndicesGetMappingRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesGetMappingResponse, unknown>>;
    getMapping(this: That, params?: T.IndicesGetMappingRequest | TB.IndicesGetMappingRequest, options?: TransportRequestOptions): Promise<T.IndicesGetMappingResponse>;
    /**
      * Returns setting information for one or more indices. For data streams, returns setting information for the stream’s backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-get-settings.html | Elasticsearch API documentation}
      */
    getSettings(this: That, params?: T.IndicesGetSettingsRequest | TB.IndicesGetSettingsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesGetSettingsResponse>;
    getSettings(this: That, params?: T.IndicesGetSettingsRequest | TB.IndicesGetSettingsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesGetSettingsResponse, unknown>>;
    getSettings(this: That, params?: T.IndicesGetSettingsRequest | TB.IndicesGetSettingsRequest, options?: TransportRequestOptions): Promise<T.IndicesGetSettingsResponse>;
    /**
      * Get index templates. Retrieves information about one or more index templates.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-get-template-v1.html | Elasticsearch API documentation}
      */
    getTemplate(this: That, params?: T.IndicesGetTemplateRequest | TB.IndicesGetTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesGetTemplateResponse>;
    getTemplate(this: That, params?: T.IndicesGetTemplateRequest | TB.IndicesGetTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesGetTemplateResponse, unknown>>;
    getTemplate(this: That, params?: T.IndicesGetTemplateRequest | TB.IndicesGetTemplateRequest, options?: TransportRequestOptions): Promise<T.IndicesGetTemplateResponse>;
    /**
      * Converts an index alias to a data stream. You must have a matching index template that is data stream enabled. The alias must meet the following criteria: The alias must have a write index; All indices for the alias must have a `@timestamp` field mapping of a `date` or `date_nanos` field type; The alias must not have any filters; The alias must not use custom routing. If successful, the request removes the alias and creates a data stream with the same name. The indices for the alias become hidden backing indices for the stream. The write index for the alias becomes the write index for the stream.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/data-streams.html | Elasticsearch API documentation}
      */
    migrateToDataStream(this: That, params: T.IndicesMigrateToDataStreamRequest | TB.IndicesMigrateToDataStreamRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesMigrateToDataStreamResponse>;
    migrateToDataStream(this: That, params: T.IndicesMigrateToDataStreamRequest | TB.IndicesMigrateToDataStreamRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesMigrateToDataStreamResponse, unknown>>;
    migrateToDataStream(this: That, params: T.IndicesMigrateToDataStreamRequest | TB.IndicesMigrateToDataStreamRequest, options?: TransportRequestOptions): Promise<T.IndicesMigrateToDataStreamResponse>;
    /**
      * Performs one or more data stream modification actions in a single atomic operation.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/data-streams.html | Elasticsearch API documentation}
      */
    modifyDataStream(this: That, params: T.IndicesModifyDataStreamRequest | TB.IndicesModifyDataStreamRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesModifyDataStreamResponse>;
    modifyDataStream(this: That, params: T.IndicesModifyDataStreamRequest | TB.IndicesModifyDataStreamRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesModifyDataStreamResponse, unknown>>;
    modifyDataStream(this: That, params: T.IndicesModifyDataStreamRequest | TB.IndicesModifyDataStreamRequest, options?: TransportRequestOptions): Promise<T.IndicesModifyDataStreamResponse>;
    /**
      * Opens a closed index. For data streams, the API opens any closed backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-open-close.html | Elasticsearch API documentation}
      */
    open(this: That, params: T.IndicesOpenRequest | TB.IndicesOpenRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesOpenResponse>;
    open(this: That, params: T.IndicesOpenRequest | TB.IndicesOpenRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesOpenResponse, unknown>>;
    open(this: That, params: T.IndicesOpenRequest | TB.IndicesOpenRequest, options?: TransportRequestOptions): Promise<T.IndicesOpenResponse>;
    /**
      * Promotes a data stream from a replicated data stream managed by CCR to a regular data stream
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/data-streams.html | Elasticsearch API documentation}
      */
    promoteDataStream(this: That, params: T.IndicesPromoteDataStreamRequest | TB.IndicesPromoteDataStreamRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesPromoteDataStreamResponse>;
    promoteDataStream(this: That, params: T.IndicesPromoteDataStreamRequest | TB.IndicesPromoteDataStreamRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesPromoteDataStreamResponse, unknown>>;
    promoteDataStream(this: That, params: T.IndicesPromoteDataStreamRequest | TB.IndicesPromoteDataStreamRequest, options?: TransportRequestOptions): Promise<T.IndicesPromoteDataStreamResponse>;
    /**
      * Adds a data stream or index to an alias.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-aliases.html | Elasticsearch API documentation}
      */
    putAlias(this: That, params: T.IndicesPutAliasRequest | TB.IndicesPutAliasRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesPutAliasResponse>;
    putAlias(this: That, params: T.IndicesPutAliasRequest | TB.IndicesPutAliasRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesPutAliasResponse, unknown>>;
    putAlias(this: That, params: T.IndicesPutAliasRequest | TB.IndicesPutAliasRequest, options?: TransportRequestOptions): Promise<T.IndicesPutAliasResponse>;
    /**
      * Update the data lifecycle of the specified data streams.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/data-streams-put-lifecycle.html | Elasticsearch API documentation}
      */
    putDataLifecycle(this: That, params: T.IndicesPutDataLifecycleRequest | TB.IndicesPutDataLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesPutDataLifecycleResponse>;
    putDataLifecycle(this: That, params: T.IndicesPutDataLifecycleRequest | TB.IndicesPutDataLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesPutDataLifecycleResponse, unknown>>;
    putDataLifecycle(this: That, params: T.IndicesPutDataLifecycleRequest | TB.IndicesPutDataLifecycleRequest, options?: TransportRequestOptions): Promise<T.IndicesPutDataLifecycleResponse>;
    /**
      * Create or update an index template. Index templates define settings, mappings, and aliases that can be applied automatically to new indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-put-template.html | Elasticsearch API documentation}
      */
    putIndexTemplate(this: That, params: T.IndicesPutIndexTemplateRequest | TB.IndicesPutIndexTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesPutIndexTemplateResponse>;
    putIndexTemplate(this: That, params: T.IndicesPutIndexTemplateRequest | TB.IndicesPutIndexTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesPutIndexTemplateResponse, unknown>>;
    putIndexTemplate(this: That, params: T.IndicesPutIndexTemplateRequest | TB.IndicesPutIndexTemplateRequest, options?: TransportRequestOptions): Promise<T.IndicesPutIndexTemplateResponse>;
    /**
      * Adds new fields to an existing data stream or index. You can also use this API to change the search settings of existing fields. For data streams, these changes are applied to all backing indices by default.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-put-mapping.html | Elasticsearch API documentation}
      */
    putMapping(this: That, params: T.IndicesPutMappingRequest | TB.IndicesPutMappingRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesPutMappingResponse>;
    putMapping(this: That, params: T.IndicesPutMappingRequest | TB.IndicesPutMappingRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesPutMappingResponse, unknown>>;
    putMapping(this: That, params: T.IndicesPutMappingRequest | TB.IndicesPutMappingRequest, options?: TransportRequestOptions): Promise<T.IndicesPutMappingResponse>;
    /**
      * Changes a dynamic index setting in real time. For data streams, index setting changes are applied to all backing indices by default.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-update-settings.html | Elasticsearch API documentation}
      */
    putSettings(this: That, params: T.IndicesPutSettingsRequest | TB.IndicesPutSettingsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesPutSettingsResponse>;
    putSettings(this: That, params: T.IndicesPutSettingsRequest | TB.IndicesPutSettingsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesPutSettingsResponse, unknown>>;
    putSettings(this: That, params: T.IndicesPutSettingsRequest | TB.IndicesPutSettingsRequest, options?: TransportRequestOptions): Promise<T.IndicesPutSettingsResponse>;
    /**
      * Create or update an index template. Index templates define settings, mappings, and aliases that can be applied automatically to new indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-templates-v1.html | Elasticsearch API documentation}
      */
    putTemplate(this: That, params: T.IndicesPutTemplateRequest | TB.IndicesPutTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesPutTemplateResponse>;
    putTemplate(this: That, params: T.IndicesPutTemplateRequest | TB.IndicesPutTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesPutTemplateResponse, unknown>>;
    putTemplate(this: That, params: T.IndicesPutTemplateRequest | TB.IndicesPutTemplateRequest, options?: TransportRequestOptions): Promise<T.IndicesPutTemplateResponse>;
    /**
      * Returns information about ongoing and completed shard recoveries for one or more indices. For data streams, the API returns information for the stream’s backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-recovery.html | Elasticsearch API documentation}
      */
    recovery(this: That, params?: T.IndicesRecoveryRequest | TB.IndicesRecoveryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesRecoveryResponse>;
    recovery(this: That, params?: T.IndicesRecoveryRequest | TB.IndicesRecoveryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesRecoveryResponse, unknown>>;
    recovery(this: That, params?: T.IndicesRecoveryRequest | TB.IndicesRecoveryRequest, options?: TransportRequestOptions): Promise<T.IndicesRecoveryResponse>;
    /**
      * A refresh makes recent operations performed on one or more indices available for search. For data streams, the API runs the refresh operation on the stream’s backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-refresh.html | Elasticsearch API documentation}
      */
    refresh(this: That, params?: T.IndicesRefreshRequest | TB.IndicesRefreshRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesRefreshResponse>;
    refresh(this: That, params?: T.IndicesRefreshRequest | TB.IndicesRefreshRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesRefreshResponse, unknown>>;
    refresh(this: That, params?: T.IndicesRefreshRequest | TB.IndicesRefreshRequest, options?: TransportRequestOptions): Promise<T.IndicesRefreshResponse>;
    /**
      * Reloads an index's search analyzers and their resources.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-reload-analyzers.html | Elasticsearch API documentation}
      */
    reloadSearchAnalyzers(this: That, params: T.IndicesReloadSearchAnalyzersRequest | TB.IndicesReloadSearchAnalyzersRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesReloadSearchAnalyzersResponse>;
    reloadSearchAnalyzers(this: That, params: T.IndicesReloadSearchAnalyzersRequest | TB.IndicesReloadSearchAnalyzersRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesReloadSearchAnalyzersResponse, unknown>>;
    reloadSearchAnalyzers(this: That, params: T.IndicesReloadSearchAnalyzersRequest | TB.IndicesReloadSearchAnalyzersRequest, options?: TransportRequestOptions): Promise<T.IndicesReloadSearchAnalyzersResponse>;
    /**
      * Resolves the specified index expressions to return information about each cluster, including the local cluster, if included. Multiple patterns and remote clusters are supported.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-resolve-cluster-api.html | Elasticsearch API documentation}
      */
    resolveCluster(this: That, params: T.IndicesResolveClusterRequest | TB.IndicesResolveClusterRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesResolveClusterResponse>;
    resolveCluster(this: That, params: T.IndicesResolveClusterRequest | TB.IndicesResolveClusterRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesResolveClusterResponse, unknown>>;
    resolveCluster(this: That, params: T.IndicesResolveClusterRequest | TB.IndicesResolveClusterRequest, options?: TransportRequestOptions): Promise<T.IndicesResolveClusterResponse>;
    /**
      * Resolves the specified name(s) and/or index patterns for indices, aliases, and data streams. Multiple patterns and remote clusters are supported.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-resolve-index-api.html | Elasticsearch API documentation}
      */
    resolveIndex(this: That, params: T.IndicesResolveIndexRequest | TB.IndicesResolveIndexRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesResolveIndexResponse>;
    resolveIndex(this: That, params: T.IndicesResolveIndexRequest | TB.IndicesResolveIndexRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesResolveIndexResponse, unknown>>;
    resolveIndex(this: That, params: T.IndicesResolveIndexRequest | TB.IndicesResolveIndexRequest, options?: TransportRequestOptions): Promise<T.IndicesResolveIndexResponse>;
    /**
      * Creates a new index for a data stream or index alias.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-rollover-index.html | Elasticsearch API documentation}
      */
    rollover(this: That, params: T.IndicesRolloverRequest | TB.IndicesRolloverRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesRolloverResponse>;
    rollover(this: That, params: T.IndicesRolloverRequest | TB.IndicesRolloverRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesRolloverResponse, unknown>>;
    rollover(this: That, params: T.IndicesRolloverRequest | TB.IndicesRolloverRequest, options?: TransportRequestOptions): Promise<T.IndicesRolloverResponse>;
    /**
      * Returns low-level information about the Lucene segments in index shards. For data streams, the API returns information about the stream’s backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-segments.html | Elasticsearch API documentation}
      */
    segments(this: That, params?: T.IndicesSegmentsRequest | TB.IndicesSegmentsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesSegmentsResponse>;
    segments(this: That, params?: T.IndicesSegmentsRequest | TB.IndicesSegmentsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesSegmentsResponse, unknown>>;
    segments(this: That, params?: T.IndicesSegmentsRequest | TB.IndicesSegmentsRequest, options?: TransportRequestOptions): Promise<T.IndicesSegmentsResponse>;
    /**
      * Retrieves store information about replica shards in one or more indices. For data streams, the API retrieves store information for the stream’s backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-shards-stores.html | Elasticsearch API documentation}
      */
    shardStores(this: That, params?: T.IndicesShardStoresRequest | TB.IndicesShardStoresRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesShardStoresResponse>;
    shardStores(this: That, params?: T.IndicesShardStoresRequest | TB.IndicesShardStoresRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesShardStoresResponse, unknown>>;
    shardStores(this: That, params?: T.IndicesShardStoresRequest | TB.IndicesShardStoresRequest, options?: TransportRequestOptions): Promise<T.IndicesShardStoresResponse>;
    /**
      * Shrinks an existing index into a new index with fewer primary shards.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-shrink-index.html | Elasticsearch API documentation}
      */
    shrink(this: That, params: T.IndicesShrinkRequest | TB.IndicesShrinkRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesShrinkResponse>;
    shrink(this: That, params: T.IndicesShrinkRequest | TB.IndicesShrinkRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesShrinkResponse, unknown>>;
    shrink(this: That, params: T.IndicesShrinkRequest | TB.IndicesShrinkRequest, options?: TransportRequestOptions): Promise<T.IndicesShrinkResponse>;
    /**
      * Simulate an index. Returns the index configuration that would be applied to the specified index from an existing index template.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-simulate-index.html | Elasticsearch API documentation}
      */
    simulateIndexTemplate(this: That, params: T.IndicesSimulateIndexTemplateRequest | TB.IndicesSimulateIndexTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesSimulateIndexTemplateResponse>;
    simulateIndexTemplate(this: That, params: T.IndicesSimulateIndexTemplateRequest | TB.IndicesSimulateIndexTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesSimulateIndexTemplateResponse, unknown>>;
    simulateIndexTemplate(this: That, params: T.IndicesSimulateIndexTemplateRequest | TB.IndicesSimulateIndexTemplateRequest, options?: TransportRequestOptions): Promise<T.IndicesSimulateIndexTemplateResponse>;
    /**
      * Simulate an index template. Returns the index configuration that would be applied by a particular index template.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-simulate-template.html | Elasticsearch API documentation}
      */
    simulateTemplate(this: That, params?: T.IndicesSimulateTemplateRequest | TB.IndicesSimulateTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesSimulateTemplateResponse>;
    simulateTemplate(this: That, params?: T.IndicesSimulateTemplateRequest | TB.IndicesSimulateTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesSimulateTemplateResponse, unknown>>;
    simulateTemplate(this: That, params?: T.IndicesSimulateTemplateRequest | TB.IndicesSimulateTemplateRequest, options?: TransportRequestOptions): Promise<T.IndicesSimulateTemplateResponse>;
    /**
      * Splits an existing index into a new index with more primary shards.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-split-index.html | Elasticsearch API documentation}
      */
    split(this: That, params: T.IndicesSplitRequest | TB.IndicesSplitRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesSplitResponse>;
    split(this: That, params: T.IndicesSplitRequest | TB.IndicesSplitRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesSplitResponse, unknown>>;
    split(this: That, params: T.IndicesSplitRequest | TB.IndicesSplitRequest, options?: TransportRequestOptions): Promise<T.IndicesSplitResponse>;
    /**
      * Returns statistics for one or more indices. For data streams, the API retrieves statistics for the stream’s backing indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-stats.html | Elasticsearch API documentation}
      */
    stats(this: That, params?: T.IndicesStatsRequest | TB.IndicesStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesStatsResponse>;
    stats(this: That, params?: T.IndicesStatsRequest | TB.IndicesStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesStatsResponse, unknown>>;
    stats(this: That, params?: T.IndicesStatsRequest | TB.IndicesStatsRequest, options?: TransportRequestOptions): Promise<T.IndicesStatsResponse>;
    /**
      * Unfreezes an index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/unfreeze-index-api.html | Elasticsearch API documentation}
      */
    unfreeze(this: That, params: T.IndicesUnfreezeRequest | TB.IndicesUnfreezeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesUnfreezeResponse>;
    unfreeze(this: That, params: T.IndicesUnfreezeRequest | TB.IndicesUnfreezeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesUnfreezeResponse, unknown>>;
    unfreeze(this: That, params: T.IndicesUnfreezeRequest | TB.IndicesUnfreezeRequest, options?: TransportRequestOptions): Promise<T.IndicesUnfreezeResponse>;
    /**
      * Adds a data stream or index to an alias.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/indices-aliases.html | Elasticsearch API documentation}
      */
    updateAliases(this: That, params?: T.IndicesUpdateAliasesRequest | TB.IndicesUpdateAliasesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesUpdateAliasesResponse>;
    updateAliases(this: That, params?: T.IndicesUpdateAliasesRequest | TB.IndicesUpdateAliasesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesUpdateAliasesResponse, unknown>>;
    updateAliases(this: That, params?: T.IndicesUpdateAliasesRequest | TB.IndicesUpdateAliasesRequest, options?: TransportRequestOptions): Promise<T.IndicesUpdateAliasesResponse>;
    /**
      * Validates a potentially expensive query without executing it.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-validate.html | Elasticsearch API documentation}
      */
    validateQuery(this: That, params?: T.IndicesValidateQueryRequest | TB.IndicesValidateQueryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndicesValidateQueryResponse>;
    validateQuery(this: That, params?: T.IndicesValidateQueryRequest | TB.IndicesValidateQueryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndicesValidateQueryResponse, unknown>>;
    validateQuery(this: That, params?: T.IndicesValidateQueryRequest | TB.IndicesValidateQueryRequest, options?: TransportRequestOptions): Promise<T.IndicesValidateQueryResponse>;
}
export {};
