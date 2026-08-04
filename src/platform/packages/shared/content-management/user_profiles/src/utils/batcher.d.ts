/**
 * Batcher. (Inspired by @yornaath/batshit, couldn't use the lib because couldn't import not transpiled code)
 * A batch manager that will batch requests for a certain data type within a given window.
 *
 * @generic Data - The type of the data return by fetcher.
 * @generic Query - item query type
 * @generic Result - the result of the individual request
 */
export interface Batcher<Data, Query, Result = Data> {
    fetch: (query: Query) => Promise<Result>;
}
/**
 * Config needed to create a Batcher
 *
 * @generic Data - The type of the data.
 * @generic Query - item query type
 * @generic Result - the result of the individual request
 */
export interface BatcherConfig<Data, Query, Result> {
    /**
     * Fetcher function that will be called with a batch of queries.
     * @param queries
     */
    fetcher: (queries: Query[]) => Promise<Data>;
    /**
     * Resolver function that will be called with the fetched data and the query.
     * Should return the result of the individual "request".
     */
    resolver: (items: Data, query: Query) => Result;
}
/**
 * Create a batch manager for a given collection of a data type.
 * Will batch all .get calls given inside a scheduled time window into a single request.
 */
export declare const createBatcher: <Data, Query, R = Data>(config: BatcherConfig<Data, Query, R>) => Batcher<Data, Query, ReturnType<(typeof config)["resolver"]>>;
