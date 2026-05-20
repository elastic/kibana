import type { AutoRefreshDoneFn, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataMain$, DataRefetch$ } from '../state_management/discover_data_state_container';
import type { DiscoverSearchSessionManager } from '../state_management/discover_search_session';
/**
 * This function returns an observable that's used to trigger data fetching
 */
export declare function getFetch$({ setAutoRefreshDone, data, main$, refetch$, searchSessionManager, }: {
    setAutoRefreshDone: (val: AutoRefreshDoneFn | undefined) => void;
    data: DataPublicPluginStart;
    main$: DataMain$;
    refetch$: DataRefetch$;
    searchSessionManager: DiscoverSearchSessionManager;
}): import("rxjs").Observable<string | void | AutoRefreshDoneFn | null | undefined>;
