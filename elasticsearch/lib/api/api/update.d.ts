import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Updates a document with a script or partial document.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-update.html | Elasticsearch API documentation}
  */
export default function UpdateApi<TDocument = unknown, TPartialDocument = unknown, TDocumentR = unknown>(this: That, params: T.UpdateRequest<TDocument, TPartialDocument> | TB.UpdateRequest<TDocument, TPartialDocument>, options?: TransportRequestOptionsWithOutMeta): Promise<T.UpdateResponse<TDocumentR>>;
export default function UpdateApi<TDocument = unknown, TPartialDocument = unknown, TDocumentR = unknown>(this: That, params: T.UpdateRequest<TDocument, TPartialDocument> | TB.UpdateRequest<TDocument, TPartialDocument>, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.UpdateResponse<TDocumentR>, unknown>>;
export default function UpdateApi<TDocument = unknown, TPartialDocument = unknown, TDocumentR = unknown>(this: That, params: T.UpdateRequest<TDocument, TPartialDocument> | TB.UpdateRequest<TDocument, TPartialDocument>, options?: TransportRequestOptions): Promise<T.UpdateResponse<TDocumentR>>;
export {};
