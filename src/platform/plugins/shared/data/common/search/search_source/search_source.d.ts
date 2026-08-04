import { Observable } from 'rxjs';
import type { estypes } from '@elastic/elasticsearch';
import type { DataViewLazy, DataViewsContract } from '@kbn/data-views-plugin/common';
import type { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import type { ISearchGeneric, IKibanaSearchResponse } from '@kbn/search-types';
import type { DataViewField, SerializedSearchSourceFields } from '../..';
import type { ISearchSource, SearchSourceFields, SearchSourceOptions, SearchSourceSearchOptions } from './types';
import type { FetchHandlers, SearchRequest } from './fetch';
import type { AggsStart } from '../aggs';
/** @internal */
export declare const searchSourceRequiredUiSettings: string[];
export interface SearchSourceDependencies extends FetchHandlers {
    aggs: AggsStart;
    search: ISearchGeneric;
    dataViews: DataViewsContract;
    scriptedFieldsEnabled: boolean;
}
interface ExpressionAstOptions {
    /**
     * When truthy, it will include either `esaggs` or `esdsl` function to the expression chain.
     * In this case, the expression will perform a search and return the `datatable` structure.
     * @default true
     */
    asDatatable?: boolean;
}
/** @public **/
export declare class SearchSource {
    private id;
    private shouldOverwriteDataViewType;
    private overwriteDataViewType?;
    private parent?;
    private requestStartHandlers;
    private inheritOptions;
    history: SearchRequest[];
    private fields;
    private readonly dependencies;
    constructor(fields: SearchSourceFields | undefined, dependencies: SearchSourceDependencies);
    /** ***
     * PUBLIC API
     *****/
    /**
     * Used to make the search source overwrite the actual data view type for the
     * specific requests done. This should only be needed very rarely, since it means
     * e.g. we'd be treating a rollup index pattern as a regular one. Be very sure
     * you understand the consequences of using this method before using it.
     *
     * @param overwriteType If `false` is passed in it will disable the overwrite, otherwise
     *    the passed in value will be used as the data view type for this search source.
     */
    setOverwriteDataViewType(overwriteType: string | undefined | false): void;
    /**
     * sets value to a single search source field
     * @param field: field name
     * @param value: value for the field
     */
    setField<K extends keyof SearchSourceFields>(field: K, value: SearchSourceFields[K]): this;
    /**
     * remove field
     * @param field: field name
     */
    removeField<K extends keyof SearchSourceFields>(field: K): this;
    /**
     * Internal, do not use. Overrides all search source fields with the new field array.
     *
     * @internal
     * @param newFields New field array.
     */
    private setFields;
    /**
     * returns search source id
     */
    getId(): string;
    /**
     * returns all search source fields
     */
    getFields(): SearchSourceFields;
    /**
     * Gets a single field from the fields
     */
    getField<K extends keyof SearchSourceFields>(field: K, recurse?: boolean): SearchSourceFields[K];
    getActiveIndexFilter(): any[];
    /**
     * Get the field from our own fields, don't traverse up the chain
     */
    getOwnField<K extends keyof SearchSourceFields>(field: K): SearchSourceFields[K];
    /**
     * @deprecated Don't use.
     */
    create(): SearchSource;
    /**
     * creates a copy of this search source (without its children)
     */
    createCopy(): SearchSource;
    /**
     * creates a new child search source
     * @param options
     */
    createChild(options?: {}): SearchSource;
    /**
     * Set a searchSource that this source should inherit from
     * @param  {SearchSource} parent - the parent searchSource
     * @param  {SearchSourceOptions} options - the inherit options
     */
    setParent(parent?: ISearchSource, options?: SearchSourceOptions): this;
    /**
     * Get the parent of this SearchSource
     */
    getParent(): SearchSource | undefined;
    /**
     * Fetch this source from Elasticsearch, returning an observable over the response(s)
     * @param options
     */
    fetch$<T = {}>(options?: SearchSourceSearchOptions): Observable<IKibanaSearchResponse<estypes.SearchResponse<T>>>;
    /**
     * Fetch this source and reject the returned Promise on error
     * @deprecated Use the `fetch$` method instead
     */
    fetch(options?: SearchSourceSearchOptions): Promise<estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>>;
    /**
     *  Add a handler that will be notified whenever requests start
     *  @param  {Function} handler
     */
    onRequestStart(handler: (searchSource: SearchSource, options?: SearchSourceSearchOptions) => Promise<unknown>): void;
    /**
     * Returns body contents of the search request, often referred as query DSL.
     */
    getSearchRequestBody(): any;
    /**
     * Completely destroy the SearchSource.
     */
    destroy(): void;
    /** ****
     * PRIVATE APIS
     ******/
    private inspectSearch;
    private hasPostFlightRequests;
    private postFlightTransform;
    private fetchOthers;
    /**
     * Run a search using the search service
     */
    private fetchSearch$;
    /**
     *  Called by requests of this search source when they are started
     *  @param options
     */
    private requestIsStarting;
    /**
     * Used to merge properties into the data within ._flatten().
     * The data is passed in and modified by the function
     *
     * @param  {object} data - the current merged data
     * @param  {*} val - the value at `key`
     * @param  {*} key - The key of `val`
     */
    private mergeProp;
    /**
     * Walk the inheritance chain of a source and return its
     * flat representation (taking into account merging rules)
     * @resolved {Object|null} - the flat data of the SearchSource
     */
    private mergeProps;
    private getIndexType;
    private getDataView;
    private readonly getFieldName;
    private getFieldsWithoutSourceFilters;
    private getFieldFromDocValueFieldsOrIndexPattern;
    loadDataViewFields(dataView: DataViewLazy): Promise<Record<string, DataViewField>>;
    private flatten;
    private getFieldFilter;
    private getUniqueFieldNames;
    private filterScriptFields;
    private getBuiltEsQuery;
    private getRemainingFields;
    private getFieldsList;
    private getUniqueFields;
    /**
     * serializes search source fields (which can later be passed to {@link ISearchStartSearchSource})
     */
    getSerializedFields(recurse?: boolean): SerializedSearchSourceFields;
    /**
     * Serializes the instance to a JSON string and a set of referenced objects.
     * Use this method to get a representation of the search source which can be stored in a saved object.
     *
     * The references returned by this function can be mixed with other references in the same object,
     * however make sure there are no name-collisions. The references will be named `kibanaSavedObjectMeta.searchSourceJSON.index`
     * and `kibanaSavedObjectMeta.searchSourceJSON.filter[<number>].meta.index`.
     *
     * Using `createSearchSource`, the instance can be re-created.
     * @public */
    serialize(): {
        searchSourceJSON: string;
        references: import("@kbn/core/packages/saved-objects/api-server").SavedObjectReference[];
    };
    private getFilters;
    /**
     * Generates an expression abstract syntax tree using the fields set in the current search source and its ancestors.
     * The produced expression from the returned AST will return the `datatable` structure.
     * If the `asDatatable` option is truthy or omitted, the generator will use the `esdsl` function to perform the search.
     * When the `aggs` field is present, it will use the `esaggs` function instead.
     */
    toExpressionAst({ asDatatable }?: ExpressionAstOptions): ExpressionAstExpression;
    parseActiveIndexPatternFromQueryString(queryString: string): string[];
}
export {};
