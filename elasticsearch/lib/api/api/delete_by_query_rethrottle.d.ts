import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Changes the number of requests per second for a particular Delete By Query operation.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-delete-by-query.html | Elasticsearch API documentation}
  */
export default function DeleteByQueryRethrottleApi(this: That, params: T.DeleteByQueryRethrottleRequest | TB.DeleteByQueryRethrottleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.DeleteByQueryRethrottleResponse>;
export default function DeleteByQueryRethrottleApi(this: That, params: T.DeleteByQueryRethrottleRequest | TB.DeleteByQueryRethrottleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.DeleteByQueryRethrottleResponse, unknown>>;
export default function DeleteByQueryRethrottleApi(this: That, params: T.DeleteByQueryRethrottleRequest | TB.DeleteByQueryRethrottleRequest, options?: TransportRequestOptions): Promise<T.DeleteByQueryRethrottleResponse>;
export {};
