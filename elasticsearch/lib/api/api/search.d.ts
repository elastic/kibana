import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Returns search hits that match the query defined in the request. You can provide search queries using the `q` query string parameter or the request body. If both are specified, only the query parameter is used.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-search.html | Elasticsearch API documentation}
  */
export default function SearchApi<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params?: T.SearchRequest | TB.SearchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchResponse<TDocument, TAggregations>>;
export default function SearchApi<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params?: T.SearchRequest | TB.SearchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchResponse<TDocument, TAggregations>, unknown>>;
export default function SearchApi<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params?: T.SearchRequest | TB.SearchRequest, options?: TransportRequestOptions): Promise<T.SearchResponse<TDocument, TAggregations>>;
export {};
