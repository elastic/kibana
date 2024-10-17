import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Deletes documents that match the specified query.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-delete-by-query.html | Elasticsearch API documentation}
  */
export default function DeleteByQueryApi(this: That, params: T.DeleteByQueryRequest | TB.DeleteByQueryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.DeleteByQueryResponse>;
export default function DeleteByQueryApi(this: That, params: T.DeleteByQueryRequest | TB.DeleteByQueryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.DeleteByQueryResponse, unknown>>;
export default function DeleteByQueryApi(this: That, params: T.DeleteByQueryRequest | TB.DeleteByQueryRequest, options?: TransportRequestOptions): Promise<T.DeleteByQueryResponse>;
export {};
