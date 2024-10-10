import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Eql {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes an async EQL search or a stored synchronous EQL search. The API also deletes results for the search.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/eql-search-api.html | Elasticsearch API documentation}
      */
    delete(this: That, params: T.EqlDeleteRequest | TB.EqlDeleteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.EqlDeleteResponse>;
    delete(this: That, params: T.EqlDeleteRequest | TB.EqlDeleteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.EqlDeleteResponse, unknown>>;
    delete(this: That, params: T.EqlDeleteRequest | TB.EqlDeleteRequest, options?: TransportRequestOptions): Promise<T.EqlDeleteResponse>;
    /**
      * Returns the current status and available results for an async EQL search or a stored synchronous EQL search.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-async-eql-search-api.html | Elasticsearch API documentation}
      */
    get<TEvent = unknown>(this: That, params: T.EqlGetRequest | TB.EqlGetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.EqlGetResponse<TEvent>>;
    get<TEvent = unknown>(this: That, params: T.EqlGetRequest | TB.EqlGetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.EqlGetResponse<TEvent>, unknown>>;
    get<TEvent = unknown>(this: That, params: T.EqlGetRequest | TB.EqlGetRequest, options?: TransportRequestOptions): Promise<T.EqlGetResponse<TEvent>>;
    /**
      * Returns the current status for an async EQL search or a stored synchronous EQL search without returning results.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-async-eql-status-api.html | Elasticsearch API documentation}
      */
    getStatus(this: That, params: T.EqlGetStatusRequest | TB.EqlGetStatusRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.EqlGetStatusResponse>;
    getStatus(this: That, params: T.EqlGetStatusRequest | TB.EqlGetStatusRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.EqlGetStatusResponse, unknown>>;
    getStatus(this: That, params: T.EqlGetStatusRequest | TB.EqlGetStatusRequest, options?: TransportRequestOptions): Promise<T.EqlGetStatusResponse>;
    /**
      * Returns results matching a query expressed in Event Query Language (EQL)
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/eql-search-api.html | Elasticsearch API documentation}
      */
    search<TEvent = unknown>(this: That, params: T.EqlSearchRequest | TB.EqlSearchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.EqlSearchResponse<TEvent>>;
    search<TEvent = unknown>(this: That, params: T.EqlSearchRequest | TB.EqlSearchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.EqlSearchResponse<TEvent>, unknown>>;
    search<TEvent = unknown>(this: That, params: T.EqlSearchRequest | TB.EqlSearchRequest, options?: TransportRequestOptions): Promise<T.EqlSearchResponse<TEvent>>;
}
export {};
