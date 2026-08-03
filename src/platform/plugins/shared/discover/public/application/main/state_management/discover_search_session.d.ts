import type { History } from 'history';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
export interface DiscoverSearchSessionManagerDeps {
    history: History;
    session: DataPublicPluginStart['search']['session'];
}
/**
 * Helps with state management of search session and {@link SEARCH_SESSION_ID_QUERY_PARAM} in the URL
 */
export declare class DiscoverSearchSessionManager {
    private readonly deps;
    constructor(deps: DiscoverSearchSessionManagerDeps);
    /**
     * Notifies about `searchSessionId` changes in the URL,
     * skips if `searchSessionId` matches current search session id
     */
    getNewSearchSessionIdFromURL$(): import("rxjs").Observable<string | null>;
    /**
     * Get next session id by either starting or restoring a session.
     * When navigating away from the restored session {@link SEARCH_SESSION_ID_QUERY_PARAM} is removed from the URL using history.replace
     */
    getNextSearchSessionId(): {
        searchSessionId: string;
        isSearchSessionRestored: boolean;
    };
    /**
     * Pushes the provided search session ID to the URL
     * @param searchSessionId - the search session ID to push to the URL
     */
    pushSearchSessionIdToURL(searchSessionId: string, { replace }?: {
        replace?: boolean;
    }): void;
    /**
     * Removes Discovers {@link SEARCH_SESSION_ID_QUERY_PARAM} from the URL
     * @param replace - methods to change the URL
     */
    removeSearchSessionIdFromURL({ replace }?: {
        replace?: boolean;
    }): void;
    /**
     * If there is a {@link SEARCH_SESSION_ID_QUERY_PARAM} currently in the URL
     */
    hasSearchSessionIdInURL(): boolean;
    private getSearchSessionIdFromURL;
}
