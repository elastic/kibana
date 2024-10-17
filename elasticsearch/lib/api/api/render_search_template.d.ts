import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Renders a search template as a search request body.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/render-search-template-api.html | Elasticsearch API documentation}
  */
export default function RenderSearchTemplateApi(this: That, params?: T.RenderSearchTemplateRequest | TB.RenderSearchTemplateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.RenderSearchTemplateResponse>;
export default function RenderSearchTemplateApi(this: That, params?: T.RenderSearchTemplateRequest | TB.RenderSearchTemplateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.RenderSearchTemplateResponse, unknown>>;
export default function RenderSearchTemplateApi(this: That, params?: T.RenderSearchTemplateRequest | TB.RenderSearchTemplateRequest, options?: TransportRequestOptions): Promise<T.RenderSearchTemplateResponse>;
export {};
