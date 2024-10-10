import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Allows to copy documents from one index to another, optionally filtering the source documents by a query, changing the destination index settings, or fetching the documents from a remote cluster.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/docs-reindex.html | Elasticsearch API documentation}
  */
export default function ReindexApi(this: That, params: T.ReindexRequest | TB.ReindexRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ReindexResponse>;
export default function ReindexApi(this: That, params: T.ReindexRequest | TB.ReindexRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ReindexResponse, unknown>>;
export default function ReindexApi(this: That, params: T.ReindexRequest | TB.ReindexRequest, options?: TransportRequestOptions): Promise<T.ReindexResponse>;
export {};
