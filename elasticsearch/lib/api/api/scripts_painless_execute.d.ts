import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Runs a script and returns a result.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/painless/8.15/painless-execute-api.html | Elasticsearch API documentation}
  */
export default function ScriptsPainlessExecuteApi<TResult = unknown>(this: That, params?: T.ScriptsPainlessExecuteRequest | TB.ScriptsPainlessExecuteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ScriptsPainlessExecuteResponse<TResult>>;
export default function ScriptsPainlessExecuteApi<TResult = unknown>(this: That, params?: T.ScriptsPainlessExecuteRequest | TB.ScriptsPainlessExecuteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ScriptsPainlessExecuteResponse<TResult>, unknown>>;
export default function ScriptsPainlessExecuteApi<TResult = unknown>(this: That, params?: T.ScriptsPainlessExecuteRequest | TB.ScriptsPainlessExecuteRequest, options?: TransportRequestOptions): Promise<T.ScriptsPainlessExecuteResponse<TResult>>;
export {};
