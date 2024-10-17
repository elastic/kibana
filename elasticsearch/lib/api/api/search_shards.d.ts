import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Returns information about the indices and shards that a search request would be executed against.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-shards.html | Elasticsearch API documentation}
  */
export default function SearchShardsApi(this: That, params?: T.SearchShardsRequest | TB.SearchShardsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchShardsResponse>;
export default function SearchShardsApi(this: That, params?: T.SearchShardsRequest | TB.SearchShardsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchShardsResponse, unknown>>;
export default function SearchShardsApi(this: That, params?: T.SearchShardsRequest | TB.SearchShardsRequest, options?: TransportRequestOptions): Promise<T.SearchShardsResponse>;
export {};
