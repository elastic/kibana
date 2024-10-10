import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Searches a vector tile for geospatial values. Returns results as a binary Mapbox vector tile.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-vector-tile-api.html | Elasticsearch API documentation}
  */
export default function SearchMvtApi(this: That, params: T.SearchMvtRequest | TB.SearchMvtRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SearchMvtResponse>;
export default function SearchMvtApi(this: That, params: T.SearchMvtRequest | TB.SearchMvtRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SearchMvtResponse, unknown>>;
export default function SearchMvtApi(this: That, params: T.SearchMvtRequest | TB.SearchMvtRequest, options?: TransportRequestOptions): Promise<T.SearchMvtResponse>;
export {};
