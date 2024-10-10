import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Removes a JSON document from the specified index.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-delete.html | Elasticsearch API documentation}
  */
export default function DeleteApi(this: That, params: T.DeleteRequest | TB.DeleteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.DeleteResponse>;
export default function DeleteApi(this: That, params: T.DeleteRequest | TB.DeleteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.DeleteResponse, unknown>>;
export default function DeleteApi(this: That, params: T.DeleteRequest | TB.DeleteRequest, options?: TransportRequestOptions): Promise<T.DeleteResponse>;
export {};
