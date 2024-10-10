import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Returns number of documents matching a query.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-count.html | Elasticsearch API documentation}
  */
export default function CountApi(this: That, params?: T.CountRequest | TB.CountRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.CountResponse>;
export default function CountApi(this: That, params?: T.CountRequest | TB.CountRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CountResponse, unknown>>;
export default function CountApi(this: That, params?: T.CountRequest | TB.CountRequest, options?: TransportRequestOptions): Promise<T.CountResponse>;
export {};
