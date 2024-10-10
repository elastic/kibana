import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Closes a point-in-time.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/point-in-time-api.html | Elasticsearch API documentation}
  */
export default function ClosePointInTimeApi(this: That, params: T.ClosePointInTimeRequest | TB.ClosePointInTimeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ClosePointInTimeResponse>;
export default function ClosePointInTimeApi(this: That, params: T.ClosePointInTimeRequest | TB.ClosePointInTimeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ClosePointInTimeResponse, unknown>>;
export default function ClosePointInTimeApi(this: That, params: T.ClosePointInTimeRequest | TB.ClosePointInTimeRequest, options?: TransportRequestOptions): Promise<T.ClosePointInTimeResponse>;
export {};
