import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Allows to execute several search operations in one request.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-multi-search.html | Elasticsearch API documentation}
  */
export default function MsearchApi<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.MsearchRequest | TB.MsearchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MsearchResponse<TDocument, TAggregations>>;
export default function MsearchApi<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.MsearchRequest | TB.MsearchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MsearchResponse<TDocument, TAggregations>, unknown>>;
export default function MsearchApi<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.MsearchRequest | TB.MsearchRequest, options?: TransportRequestOptions): Promise<T.MsearchResponse<TDocument, TAggregations>>;
export {};
