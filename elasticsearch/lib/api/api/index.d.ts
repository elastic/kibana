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
export default function IndexApi<TDocument = unknown>(this: That, params: T.IndexRequest<TDocument> | TB.IndexRequest<TDocument>, options?: TransportRequestOptionsWithOutMeta): Promise<T.IndexResponse>;
export default function IndexApi<TDocument = unknown>(this: That, params: T.IndexRequest<TDocument> | TB.IndexRequest<TDocument>, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IndexResponse, unknown>>;
export default function IndexApi<TDocument = unknown>(this: That, params: T.IndexRequest<TDocument> | TB.IndexRequest<TDocument>, options?: TransportRequestOptions): Promise<T.IndexResponse>;
export {};
