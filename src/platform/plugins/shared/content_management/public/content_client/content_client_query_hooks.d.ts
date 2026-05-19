import type { QueryObserverOptions } from '@kbn/react-query';
import type { GetIn, SearchIn } from '../../common';
/**
 * Exposed `useQuery` options
 */
export type QueryOptions = Pick<QueryObserverOptions, 'enabled'>;
/**
 *
 * @param input - get content identifier like "id" and "contentType"
 * @param queryOptions - query options
 */
export declare const useGetContentQuery: <I extends GetIn = GetIn, O = unknown>(input: I, queryOptions?: QueryOptions) => import("@kbn/react-query").UseQueryResult<O, unknown>;
/**
 *
 * @param input - get content identifier like "id" and "contentType"
 * @param queryOptions - query options
 */
export declare const useSearchContentQuery: <I extends SearchIn = SearchIn, O = unknown>(input: I, queryOptions?: QueryOptions) => import("@kbn/react-query").UseQueryResult<O, unknown>;
