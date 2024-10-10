import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Returns available script types, languages and contexts
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-scripting.html | Elasticsearch API documentation}
  */
export default function GetScriptLanguagesApi(this: That, params?: T.GetScriptLanguagesRequest | TB.GetScriptLanguagesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.GetScriptLanguagesResponse>;
export default function GetScriptLanguagesApi(this: That, params?: T.GetScriptLanguagesRequest | TB.GetScriptLanguagesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.GetScriptLanguagesResponse, unknown>>;
export default function GetScriptLanguagesApi(this: That, params?: T.GetScriptLanguagesRequest | TB.GetScriptLanguagesRequest, options?: TransportRequestOptions): Promise<T.GetScriptLanguagesResponse>;
export {};
