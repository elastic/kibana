import type { PublicMethodsOf } from '@kbn/utility-types';
import type { CoreStart } from '@kbn/core/public';
import type { Query, AggregateQuery } from '@kbn/es-query';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
export declare class QueryStringManager {
    private readonly storage;
    private readonly uiSettings;
    private query$;
    constructor(storage: IStorageWrapper, uiSettings: CoreStart['uiSettings']);
    private getDefaultLanguage;
    getDefaultQuery(): {
        query: string;
        language: any;
    };
    formatQuery(query: Query | AggregateQuery | string | undefined): Query | AggregateQuery;
    getUpdates$: () => import("rxjs").Observable<Query | AggregateQuery>;
    getQuery: () => Query | AggregateQuery;
    /**
     * Updates the query.
     * @param {Query | AggregateQuery} query
     */
    setQuery: (query: Query | AggregateQuery) => void;
    /**
     * Resets the query to the default one.
     */
    clearQuery: () => void;
}
export type QueryStringContract = PublicMethodsOf<QueryStringManager>;
