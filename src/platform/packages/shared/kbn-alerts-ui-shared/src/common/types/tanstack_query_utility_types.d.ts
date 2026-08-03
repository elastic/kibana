import type { UseQueryOptions } from '@kbn/react-query';
/**
 * Extracts the data type from a fetching function
 */
export type FetchFnData<TFetchFn> = TFetchFn extends (...args: any) => Promise<infer TData> ? TData : TFetchFn extends (...args: any) => infer TData ? TData : never;
/**
 * A utility type used to correctly type options overrides for `useQuery`
 */
export type QueryOptionsOverrides<
/**
 * The fetching function type. TData is calculated based on this type.
 */
TFetchFn, TQueryFnData = FetchFnData<TFetchFn>, TError = unknown, TData = TQueryFnData> = Omit<UseQueryOptions<TQueryFnData, TError, TData, string[]>, 'queryKey' | 'queryFn' | 'initialData'>;
