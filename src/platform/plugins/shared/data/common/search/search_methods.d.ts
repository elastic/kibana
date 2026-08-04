import type { ISearchMethods, IDslSearchParams, IDslSearchOptions, IDslSearchResult, IDslPaginatedSearchResult, IEsqlSearchParams, IEsqlSearchOptions, IEsqlSearchResult, IEqlSearchParams, IEqlSearchOptions, IEqlSearchResult, ISqlSearchParams, ISqlSearchOptions, ISqlSearchResult, ISearchGeneric } from '@kbn/search-types';
/**
 * SearchMethodsService provides strategy-specific search methods with type-safe
 * parameters, invisible polling, and built-in pagination support.
 *
 * This is a common abstraction that works on both client and server by accepting
 * a generic search function that converts Observable-based searches to Promise-based
 * searches and adds pagination helpers for DSL searches using search_after.
 */
export declare class SearchMethodsService implements ISearchMethods {
    private readonly search;
    constructor(search: ISearchGeneric);
    /**
     * Execute an ES|QL search
     */
    esql(params: IEsqlSearchParams, options?: IEsqlSearchOptions): Promise<IEsqlSearchResult>;
    /**
     * Execute a DSL (Elasticsearch Query DSL) search
     */
    dsl(params: IDslSearchParams, options?: IDslSearchOptions): Promise<IDslSearchResult>;
    /**
     * Execute a paginated DSL (Elasticsearch Query DSL) search with pagination helpers
     */
    dslPaginated(params: IDslSearchParams, _options?: Omit<IDslSearchOptions, 'trackTotalHits'>): Promise<IDslPaginatedSearchResult>;
    /**
     * Execute an EQL (Event Query Language) search
     */
    eql(params: IEqlSearchParams, options?: IEqlSearchOptions): Promise<IEqlSearchResult>;
    /**
     * Execute a SQL search
     */
    sql(params: ISqlSearchParams, options?: ISqlSearchOptions): Promise<ISqlSearchResult>;
    /**
     * Execute a search request using the search function and convert Observable to Promise
     */
    private executeSearch;
    private buildDSLRequest;
    private mapDSLOptions;
    private buildDSLPagination;
    private buildESQLRequest;
    private mapESQLOptions;
    private buildEQLRequest;
    private mapEQLOptions;
    private buildSQLRequest;
    private mapSQLOptions;
    private mapBaseOptions;
}
