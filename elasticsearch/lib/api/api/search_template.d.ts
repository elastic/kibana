import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Runs a search with a search template.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-template.html | Elasticsearch API documentation}
  */
export default function SearchTemplateApi<TDocument = unknown>(this: That, params?: T.SearchTemplateRequest | TB.SearchTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchTemplateResponse<TDocument>>;
export default function SearchTemplateApi<TDocument = unknown>(this: That, params?: T.SearchTemplateRequest | TB.SearchTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchTemplateResponse<TDocument>, unknown>>;
export default function SearchTemplateApi<TDocument = unknown>(this: That, params?: T.SearchTemplateRequest | TB.SearchTemplateRequest, options?: TransportRequestOptions): Promise<T.SearchTemplateResponse<TDocument>>;
export {};
