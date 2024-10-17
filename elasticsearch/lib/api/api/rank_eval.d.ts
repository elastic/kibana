import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Enables you to evaluate the quality of ranked search results over a set of typical search queries.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-rank-eval.html | Elasticsearch API documentation}
  */
export default function RankEvalApi(this: That, params: T.RankEvalRequest | TB.RankEvalRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.RankEvalResponse>;
export default function RankEvalApi(this: That, params: T.RankEvalRequest | TB.RankEvalRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.RankEvalResponse, unknown>>;
export default function RankEvalApi(this: That, params: T.RankEvalRequest | TB.RankEvalRequest, options?: TransportRequestOptions): Promise<T.RankEvalResponse>;
export {};
