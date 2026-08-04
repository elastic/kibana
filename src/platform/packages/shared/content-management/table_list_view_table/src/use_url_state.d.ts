export declare function useInRouterContext(): boolean;
export declare function useUrlState<T extends Record<string, unknown> = {}, Q extends Record<string, unknown> = {}>({ queryParamsDeserializer, queryParamsSerializer, }: {
    queryParamsDeserializer: (params: Q) => T;
    queryParamsSerializer: (params: Record<string, unknown>) => Partial<Q>;
}): [T, (updated: Record<string, unknown>) => void];
