import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Checks if the specified combination of method, API, parameters, and arbitrary capabilities are supported
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/capabilities.html | Elasticsearch API documentation}
  */
export default function CapabilitiesApi(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
export default function CapabilitiesApi(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
export default function CapabilitiesApi(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
export {};
