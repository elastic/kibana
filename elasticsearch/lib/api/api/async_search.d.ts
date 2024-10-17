import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class AsyncSearch {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes an async search by identifier. If the search is still running, the search request will be cancelled. Otherwise, the saved search results are deleted. If the Elasticsearch security features are enabled, the deletion of a specific async search is restricted to: the authenticated user that submitted the original search request; users that have the `cancel_task` cluster privilege.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/async-search.html | Elasticsearch API documentation}
      */
    delete(this: That, params: T.AsyncSearchDeleteRequest | TB.AsyncSearchDeleteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.AsyncSearchDeleteResponse>;
    delete(this: That, params: T.AsyncSearchDeleteRequest | TB.AsyncSearchDeleteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.AsyncSearchDeleteResponse, unknown>>;
    delete(this: That, params: T.AsyncSearchDeleteRequest | TB.AsyncSearchDeleteRequest, options?: TransportRequestOptions): Promise<T.AsyncSearchDeleteResponse>;
    /**
      * Retrieves the results of a previously submitted async search request given its identifier. If the Elasticsearch security features are enabled, access to the results of a specific async search is restricted to the user or API key that submitted it.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/async-search.html | Elasticsearch API documentation}
      */
    get<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.AsyncSearchGetRequest | TB.AsyncSearchGetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.AsyncSearchGetResponse<TDocument, TAggregations>>;
    get<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.AsyncSearchGetRequest | TB.AsyncSearchGetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.AsyncSearchGetResponse<TDocument, TAggregations>, unknown>>;
    get<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.AsyncSearchGetRequest | TB.AsyncSearchGetRequest, options?: TransportRequestOptions): Promise<T.AsyncSearchGetResponse<TDocument, TAggregations>>;
    /**
      * Get async search status Retrieves the status of a previously submitted async search request given its identifier, without retrieving search results. If the Elasticsearch security features are enabled, use of this API is restricted to the `monitoring_user` role.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/async-search.html | Elasticsearch API documentation}
      */
    status(this: That, params: T.AsyncSearchStatusRequest | TB.AsyncSearchStatusRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.AsyncSearchStatusResponse>;
    status(this: That, params: T.AsyncSearchStatusRequest | TB.AsyncSearchStatusRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.AsyncSearchStatusResponse, unknown>>;
    status(this: That, params: T.AsyncSearchStatusRequest | TB.AsyncSearchStatusRequest, options?: TransportRequestOptions): Promise<T.AsyncSearchStatusResponse>;
    /**
      * Runs a search request asynchronously. When the primary sort of the results is an indexed field, shards get sorted based on minimum and maximum value that they hold for that field, hence partial results become available following the sort criteria that was requested. Warning: Async search does not support scroll nor search requests that only include the suggest section. By default, Elasticsearch doesn’t allow you to store an async search response larger than 10Mb and an attempt to do this results in an error. The maximum allowed size for a stored async search response can be set by changing the `search.max_async_search_response_size` cluster level setting.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/async-search.html | Elasticsearch API documentation}
      */
    submit<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params?: T.AsyncSearchSubmitRequest | TB.AsyncSearchSubmitRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.AsyncSearchSubmitResponse<TDocument, TAggregations>>;
    submit<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params?: T.AsyncSearchSubmitRequest | TB.AsyncSearchSubmitRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.AsyncSearchSubmitResponse<TDocument, TAggregations>, unknown>>;
    submit<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params?: T.AsyncSearchSubmitRequest | TB.AsyncSearchSubmitRequest, options?: TransportRequestOptions): Promise<T.AsyncSearchSubmitResponse<TDocument, TAggregations>>;
}
export {};
