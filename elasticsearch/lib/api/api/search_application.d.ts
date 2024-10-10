import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class SearchApplication {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes a search application.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-search-application.html | Elasticsearch API documentation}
      */
    delete(this: That, params: T.SearchApplicationDeleteRequest | TB.SearchApplicationDeleteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchApplicationDeleteResponse>;
    delete(this: That, params: T.SearchApplicationDeleteRequest | TB.SearchApplicationDeleteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchApplicationDeleteResponse, unknown>>;
    delete(this: That, params: T.SearchApplicationDeleteRequest | TB.SearchApplicationDeleteRequest, options?: TransportRequestOptions): Promise<T.SearchApplicationDeleteResponse>;
    /**
      * Delete a behavioral analytics collection.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-analytics-collection.html | Elasticsearch API documentation}
      */
    deleteBehavioralAnalytics(this: That, params: T.SearchApplicationDeleteBehavioralAnalyticsRequest | TB.SearchApplicationDeleteBehavioralAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchApplicationDeleteBehavioralAnalyticsResponse>;
    deleteBehavioralAnalytics(this: That, params: T.SearchApplicationDeleteBehavioralAnalyticsRequest | TB.SearchApplicationDeleteBehavioralAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchApplicationDeleteBehavioralAnalyticsResponse, unknown>>;
    deleteBehavioralAnalytics(this: That, params: T.SearchApplicationDeleteBehavioralAnalyticsRequest | TB.SearchApplicationDeleteBehavioralAnalyticsRequest, options?: TransportRequestOptions): Promise<T.SearchApplicationDeleteBehavioralAnalyticsResponse>;
    /**
      * Returns the details about a search application
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-search-application.html | Elasticsearch API documentation}
      */
    get(this: That, params: T.SearchApplicationGetRequest | TB.SearchApplicationGetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchApplicationGetResponse>;
    get(this: That, params: T.SearchApplicationGetRequest | TB.SearchApplicationGetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchApplicationGetResponse, unknown>>;
    get(this: That, params: T.SearchApplicationGetRequest | TB.SearchApplicationGetRequest, options?: TransportRequestOptions): Promise<T.SearchApplicationGetResponse>;
    /**
      * Returns the existing behavioral analytics collections.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/list-analytics-collection.html | Elasticsearch API documentation}
      */
    getBehavioralAnalytics(this: That, params?: T.SearchApplicationGetBehavioralAnalyticsRequest | TB.SearchApplicationGetBehavioralAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchApplicationGetBehavioralAnalyticsResponse>;
    getBehavioralAnalytics(this: That, params?: T.SearchApplicationGetBehavioralAnalyticsRequest | TB.SearchApplicationGetBehavioralAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchApplicationGetBehavioralAnalyticsResponse, unknown>>;
    getBehavioralAnalytics(this: That, params?: T.SearchApplicationGetBehavioralAnalyticsRequest | TB.SearchApplicationGetBehavioralAnalyticsRequest, options?: TransportRequestOptions): Promise<T.SearchApplicationGetBehavioralAnalyticsResponse>;
    /**
      * Returns the existing search applications.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/list-search-applications.html | Elasticsearch API documentation}
      */
    list(this: That, params?: T.SearchApplicationListRequest | TB.SearchApplicationListRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchApplicationListResponse>;
    list(this: That, params?: T.SearchApplicationListRequest | TB.SearchApplicationListRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchApplicationListResponse, unknown>>;
    list(this: That, params?: T.SearchApplicationListRequest | TB.SearchApplicationListRequest, options?: TransportRequestOptions): Promise<T.SearchApplicationListResponse>;
    /**
      * Creates a behavioral analytics event for existing collection.
      * @see {@link http://todo.com/tbd | Elasticsearch API documentation}
      */
    postBehavioralAnalyticsEvent(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    postBehavioralAnalyticsEvent(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    postBehavioralAnalyticsEvent(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Creates or updates a search application.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-search-application.html | Elasticsearch API documentation}
      */
    put(this: That, params: T.SearchApplicationPutRequest | TB.SearchApplicationPutRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchApplicationPutResponse>;
    put(this: That, params: T.SearchApplicationPutRequest | TB.SearchApplicationPutRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchApplicationPutResponse, unknown>>;
    put(this: That, params: T.SearchApplicationPutRequest | TB.SearchApplicationPutRequest, options?: TransportRequestOptions): Promise<T.SearchApplicationPutResponse>;
    /**
      * Creates a behavioral analytics collection.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-analytics-collection.html | Elasticsearch API documentation}
      */
    putBehavioralAnalytics(this: That, params: T.SearchApplicationPutBehavioralAnalyticsRequest | TB.SearchApplicationPutBehavioralAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchApplicationPutBehavioralAnalyticsResponse>;
    putBehavioralAnalytics(this: That, params: T.SearchApplicationPutBehavioralAnalyticsRequest | TB.SearchApplicationPutBehavioralAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchApplicationPutBehavioralAnalyticsResponse, unknown>>;
    putBehavioralAnalytics(this: That, params: T.SearchApplicationPutBehavioralAnalyticsRequest | TB.SearchApplicationPutBehavioralAnalyticsRequest, options?: TransportRequestOptions): Promise<T.SearchApplicationPutBehavioralAnalyticsResponse>;
    /**
      * Renders a query for given search application search parameters
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-application-render-query.html | Elasticsearch API documentation}
      */
    renderQuery(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    renderQuery(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    renderQuery(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Perform a search against a search application.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-application-search.html | Elasticsearch API documentation}
      */
    search<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.SearchApplicationSearchRequest | TB.SearchApplicationSearchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchApplicationSearchResponse<TDocument, TAggregations>>;
    search<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.SearchApplicationSearchRequest | TB.SearchApplicationSearchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchApplicationSearchResponse<TDocument, TAggregations>, unknown>>;
    search<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.SearchApplicationSearchRequest | TB.SearchApplicationSearchRequest, options?: TransportRequestOptions): Promise<T.SearchApplicationSearchResponse<TDocument, TAggregations>>;
}
export {};
