import type { QueryObserverOptions, QueryObserverResult, QueryClient, QueryKey } from '@kbn/react-query';
import { Observable } from 'rxjs';
export declare const createQueryObservable: <TQueryFnData = unknown, TError = unknown, TData = TQueryFnData, TQueryData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(queryClient: QueryClient, queryOptions: QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>) => Observable<QueryObserverResult<TData, TError>>;
