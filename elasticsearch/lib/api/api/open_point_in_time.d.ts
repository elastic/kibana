import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * A search request by default executes against the most recent visible data of the target indices, which is called point in time. Elasticsearch pit (point in time) is a lightweight view into the state of the data as it existed when initiated. In some cases, it’s preferred to perform multiple search requests using the same point in time. For example, if refreshes happen between `search_after` requests, then the results of those requests might not be consistent as changes happening between searches are only visible to the more recent point in time.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/point-in-time-api.html | Elasticsearch API documentation}
  */
export default function OpenPointInTimeApi(this: That, params: T.OpenPointInTimeRequest | TB.OpenPointInTimeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.OpenPointInTimeResponse>;
export default function OpenPointInTimeApi(this: That, params: T.OpenPointInTimeRequest | TB.OpenPointInTimeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.OpenPointInTimeResponse, unknown>>;
export default function OpenPointInTimeApi(this: That, params: T.OpenPointInTimeRequest | TB.OpenPointInTimeRequest, options?: TransportRequestOptions): Promise<T.OpenPointInTimeResponse>;
export {};
