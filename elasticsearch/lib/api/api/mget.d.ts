import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Allows to get multiple documents in one request.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-multi-get.html | Elasticsearch API documentation}
  */
export default function MgetApi<TDocument = unknown>(this: That, params?: T.MgetRequest | TB.MgetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MgetResponse<TDocument>>;
export default function MgetApi<TDocument = unknown>(this: That, params?: T.MgetRequest | TB.MgetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MgetResponse<TDocument>, unknown>>;
export default function MgetApi<TDocument = unknown>(this: That, params?: T.MgetRequest | TB.MgetRequest, options?: TransportRequestOptions): Promise<T.MgetResponse<TDocument>>;
export {};
