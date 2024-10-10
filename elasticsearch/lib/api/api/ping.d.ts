import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Returns whether the cluster is running.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/index.html | Elasticsearch API documentation}
  */
export default function PingApi(this: That, params?: T.PingRequest | TB.PingRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.PingResponse>;
export default function PingApi(this: That, params?: T.PingRequest | TB.PingRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.PingResponse, unknown>>;
export default function PingApi(this: That, params?: T.PingRequest | TB.PingRequest, options?: TransportRequestOptions): Promise<T.PingResponse>;
export {};
