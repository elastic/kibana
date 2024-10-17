import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Fleet {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes a secret stored by Fleet.
      */
    deleteSecret(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    deleteSecret(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    deleteSecret(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Retrieves a secret stored by Fleet.
      */
    getSecret(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    getSecret(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    getSecret(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Returns the current global checkpoints for an index. This API is design for internal use by the fleet server project.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-global-checkpoints.html | Elasticsearch API documentation}
      */
    globalCheckpoints(this: That, params: T.FleetGlobalCheckpointsRequest | TB.FleetGlobalCheckpointsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.FleetGlobalCheckpointsResponse>;
    globalCheckpoints(this: That, params: T.FleetGlobalCheckpointsRequest | TB.FleetGlobalCheckpointsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.FleetGlobalCheckpointsResponse, unknown>>;
    globalCheckpoints(this: That, params: T.FleetGlobalCheckpointsRequest | TB.FleetGlobalCheckpointsRequest, options?: TransportRequestOptions): Promise<T.FleetGlobalCheckpointsResponse>;
    /**
      * Executes several [fleet searches](https://www.elastic.co/guide/en/elasticsearch/reference/current/fleet-search.html) with a single API request. The API follows the same structure as the [multi search](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-multi-search.html) API. However, similar to the fleet search API, it supports the wait_for_checkpoints parameter.
      */
    msearch<TDocument = unknown>(this: That, params: T.FleetMsearchRequest | TB.FleetMsearchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.FleetMsearchResponse<TDocument>>;
    msearch<TDocument = unknown>(this: That, params: T.FleetMsearchRequest | TB.FleetMsearchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.FleetMsearchResponse<TDocument>, unknown>>;
    msearch<TDocument = unknown>(this: That, params: T.FleetMsearchRequest | TB.FleetMsearchRequest, options?: TransportRequestOptions): Promise<T.FleetMsearchResponse<TDocument>>;
    /**
      * Creates a secret stored by Fleet.
      */
    postSecret(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    postSecret(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    postSecret(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * The purpose of the fleet search api is to provide a search api where the search will only be executed after provided checkpoint has been processed and is visible for searches inside of Elasticsearch.
      */
    search<TDocument = unknown>(this: That, params: T.FleetSearchRequest | TB.FleetSearchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.FleetSearchResponse<TDocument>>;
    search<TDocument = unknown>(this: That, params: T.FleetSearchRequest | TB.FleetSearchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.FleetSearchResponse<TDocument>, unknown>>;
    search<TDocument = unknown>(this: That, params: T.FleetSearchRequest | TB.FleetSearchRequest, options?: TransportRequestOptions): Promise<T.FleetSearchResponse<TDocument>>;
}
export {};
