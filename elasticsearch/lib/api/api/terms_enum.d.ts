import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * The terms enum API can be used to discover terms in the index that begin with the provided string. It is designed for low-latency look-ups used in auto-complete scenarios.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-terms-enum.html | Elasticsearch API documentation}
  */
export default function TermsEnumApi(this: That, params: T.TermsEnumRequest | TB.TermsEnumRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TermsEnumResponse>;
export default function TermsEnumApi(this: That, params: T.TermsEnumRequest | TB.TermsEnumRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TermsEnumResponse, unknown>>;
export default function TermsEnumApi(this: That, params: T.TermsEnumRequest | TB.TermsEnumRequest, options?: TransportRequestOptions): Promise<T.TermsEnumResponse>;
export {};
