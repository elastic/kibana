import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Checks if a document in an index exists.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-get.html | Elasticsearch API documentation}
  */
export default function ExistsApi(this: That, params: T.ExistsRequest | TB.ExistsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ExistsResponse>;
export default function ExistsApi(this: That, params: T.ExistsRequest | TB.ExistsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ExistsResponse, unknown>>;
export default function ExistsApi(this: That, params: T.ExistsRequest | TB.ExistsRequest, options?: TransportRequestOptions): Promise<T.ExistsResponse>;
export {};
