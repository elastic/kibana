import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Returns information and statistics about terms in the fields of a particular document.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-termvectors.html | Elasticsearch API documentation}
  */
export default function TermvectorsApi<TDocument = unknown>(this: That, params: T.TermvectorsRequest<TDocument> | TB.TermvectorsRequest<TDocument>, options?: TransportRequestOptionsWithOutMeta): Promise<T.TermvectorsResponse>;
export default function TermvectorsApi<TDocument = unknown>(this: That, params: T.TermvectorsRequest<TDocument> | TB.TermvectorsRequest<TDocument>, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TermvectorsResponse, unknown>>;
export default function TermvectorsApi<TDocument = unknown>(this: That, params: T.TermvectorsRequest<TDocument> | TB.TermvectorsRequest<TDocument>, options?: TransportRequestOptions): Promise<T.TermvectorsResponse>;
export {};
