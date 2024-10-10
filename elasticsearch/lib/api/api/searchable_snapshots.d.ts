import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class SearchableSnapshots {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Retrieve node-level cache statistics about searchable snapshots.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/searchable-snapshots-apis.html | Elasticsearch API documentation}
      */
    cacheStats(this: That, params?: T.SearchableSnapshotsCacheStatsRequest | TB.SearchableSnapshotsCacheStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchableSnapshotsCacheStatsResponse>;
    cacheStats(this: That, params?: T.SearchableSnapshotsCacheStatsRequest | TB.SearchableSnapshotsCacheStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchableSnapshotsCacheStatsResponse, unknown>>;
    cacheStats(this: That, params?: T.SearchableSnapshotsCacheStatsRequest | TB.SearchableSnapshotsCacheStatsRequest, options?: TransportRequestOptions): Promise<T.SearchableSnapshotsCacheStatsResponse>;
    /**
      * Clear the cache of searchable snapshots.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/searchable-snapshots-apis.html | Elasticsearch API documentation}
      */
    clearCache(this: That, params?: T.SearchableSnapshotsClearCacheRequest | TB.SearchableSnapshotsClearCacheRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchableSnapshotsClearCacheResponse>;
    clearCache(this: That, params?: T.SearchableSnapshotsClearCacheRequest | TB.SearchableSnapshotsClearCacheRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchableSnapshotsClearCacheResponse, unknown>>;
    clearCache(this: That, params?: T.SearchableSnapshotsClearCacheRequest | TB.SearchableSnapshotsClearCacheRequest, options?: TransportRequestOptions): Promise<T.SearchableSnapshotsClearCacheResponse>;
    /**
      * Mount a snapshot as a searchable index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/searchable-snapshots-api-mount-snapshot.html | Elasticsearch API documentation}
      */
    mount(this: That, params: T.SearchableSnapshotsMountRequest | TB.SearchableSnapshotsMountRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchableSnapshotsMountResponse>;
    mount(this: That, params: T.SearchableSnapshotsMountRequest | TB.SearchableSnapshotsMountRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchableSnapshotsMountResponse, unknown>>;
    mount(this: That, params: T.SearchableSnapshotsMountRequest | TB.SearchableSnapshotsMountRequest, options?: TransportRequestOptions): Promise<T.SearchableSnapshotsMountResponse>;
    /**
      * Retrieve shard-level statistics about searchable snapshots.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/searchable-snapshots-apis.html | Elasticsearch API documentation}
      */
    stats(this: That, params?: T.SearchableSnapshotsStatsRequest | TB.SearchableSnapshotsStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchableSnapshotsStatsResponse>;
    stats(this: That, params?: T.SearchableSnapshotsStatsRequest | TB.SearchableSnapshotsStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchableSnapshotsStatsResponse, unknown>>;
    stats(this: That, params?: T.SearchableSnapshotsStatsRequest | TB.SearchableSnapshotsStatsRequest, options?: TransportRequestOptions): Promise<T.SearchableSnapshotsStatsResponse>;
}
export {};
