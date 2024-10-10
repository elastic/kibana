import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Returns multiple termvectors in one request.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-multi-termvectors.html | Elasticsearch API documentation}
  */
export default function MtermvectorsApi(this: That, params?: T.MtermvectorsRequest | TB.MtermvectorsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MtermvectorsResponse>;
export default function MtermvectorsApi(this: That, params?: T.MtermvectorsRequest | TB.MtermvectorsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MtermvectorsResponse, unknown>>;
export default function MtermvectorsApi(this: That, params?: T.MtermvectorsRequest | TB.MtermvectorsRequest, options?: TransportRequestOptions): Promise<T.MtermvectorsResponse>;
export {};
