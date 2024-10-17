import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Returns all script contexts.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/painless/8.15/painless-contexts.html | Elasticsearch API documentation}
  */
export default function GetScriptContextApi(this: That, params?: T.GetScriptContextRequest | TB.GetScriptContextRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.GetScriptContextResponse>;
export default function GetScriptContextApi(this: That, params?: T.GetScriptContextRequest | TB.GetScriptContextRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.GetScriptContextResponse, unknown>>;
export default function GetScriptContextApi(this: That, params?: T.GetScriptContextRequest | TB.GetScriptContextRequest, options?: TransportRequestOptions): Promise<T.GetScriptContextResponse>;
export {};
