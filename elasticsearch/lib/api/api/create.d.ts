import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Adds a JSON document to the specified data stream or index and makes it searchable. If the target is an index and the document already exists, the request updates the document and increments its version.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-index_.html | Elasticsearch API documentation}
  */
export default function CreateApi<TDocument = unknown>(this: That, params: T.CreateRequest<TDocument> | TB.CreateRequest<TDocument>, options?: TransportRequestOptionsWithOutMeta): Promise<T.CreateResponse>;
export default function CreateApi<TDocument = unknown>(this: That, params: T.CreateRequest<TDocument> | TB.CreateRequest<TDocument>, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.CreateResponse, unknown>>;
export default function CreateApi<TDocument = unknown>(this: That, params: T.CreateRequest<TDocument> | TB.CreateRequest<TDocument>, options?: TransportRequestOptions): Promise<T.CreateResponse>;
export {};
