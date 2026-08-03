import React from 'react';
import { BehaviorSubject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import { type QueryHistoryItem } from '../history_local_storage';
/**
 * EsqlStarredQueriesService is a service that manages the starred queries in the ES|QL editor.
 * It provides methods to add and remove queries from the starred list.
 * It also provides a method to render the starred button in the editor list table.
 *
 * @param client - The FavoritesClient instance.
 * @param starredQueries - The list of starred queries.
 * @param queries$ - The BehaviorSubject that emits the starred queries list.
 * @method initialize - Initializes the service and retrieves the starred queries from the favoriteService.
 * @method checkIfQueryIsStarred - Checks if a query is already starred.
 * @method addStarredQuery - Adds a query to the starred list.
 * @method removeStarredQuery - Removes a query from the starred list.
 * @method renderStarredButton - Renders the starred button in the editor list table.
 * @returns EsqlStarredQueriesService instance.
 *
 */
export interface StarredQueryItem extends QueryHistoryItem {
    id: string;
}
interface EsqlStarredQueriesServices {
    http: CoreStart['http'];
    userProfile: CoreStart['userProfile'];
    storage: Storage;
    usageCollection?: UsageCollectionStart;
}
interface EsqlStarredQueriesParams {
    client: FavoritesClient<StarredQueryMetadata>;
    starredQueries: StarredQueryItem[];
    storage: Storage;
}
export interface StarredQueryMetadata {
    queryString: string;
    createdAt: string;
    status: 'success' | 'warning' | 'error';
}
export declare class EsqlStarredQueriesService {
    private client;
    private starredQueries;
    private queryToEdit;
    private queryToAdd;
    private storage;
    queries$: BehaviorSubject<StarredQueryItem[]>;
    discardModalVisibility$: BehaviorSubject<boolean>;
    constructor({ client, starredQueries, storage }: EsqlStarredQueriesParams);
    static initialize(services: EsqlStarredQueriesServices): Promise<EsqlStarredQueriesService | null>;
    checkIfQueryIsStarred(queryString: string): boolean;
    private checkIfStarredQueriesLimitReached;
    addStarredQuery(item: Pick<QueryHistoryItem, 'queryString' | 'status'>): Promise<void>;
    removeStarredQuery(queryString: string): Promise<void>;
    onDiscardModalClose(shouldDismissModal?: boolean, removeQuery?: boolean): Promise<void>;
    renderStarredButton(item: QueryHistoryItem): React.JSX.Element;
}
export {};
