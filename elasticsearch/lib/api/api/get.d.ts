import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Returns a document.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-get.html | Elasticsearch API documentation}
  */
export default function GetApi<TDocument = unknown>(this: That, params: T.GetRequest | TB.GetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.GetResponse<TDocument>>;
export default function GetApi<TDocument = unknown>(this: That, params: T.GetRequest | TB.GetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.GetResponse<TDocument>, unknown>>;
export default function GetApi<TDocument = unknown>(this: That, params: T.GetRequest | TB.GetRequest, options?: TransportRequestOptions): Promise<T.GetResponse<TDocument>>;
export {};
