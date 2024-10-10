import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Updates documents that match the specified query. If no query is specified, performs an update on every document in the data stream or index without modifying the source, which is useful for picking up mapping changes.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-update-by-query.html | Elasticsearch API documentation}
  */
export default function UpdateByQueryApi(this: That, params: T.UpdateByQueryRequest | TB.UpdateByQueryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.UpdateByQueryResponse>;
export default function UpdateByQueryApi(this: That, params: T.UpdateByQueryRequest | TB.UpdateByQueryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.UpdateByQueryResponse, unknown>>;
export default function UpdateByQueryApi(this: That, params: T.UpdateByQueryRequest | TB.UpdateByQueryRequest, options?: TransportRequestOptions): Promise<T.UpdateByQueryResponse>;
export {};
