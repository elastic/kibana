import type { DataView } from '@kbn/data-views-plugin/common';
import type { ISearchSource } from '@kbn/data-plugin/common';
import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverAppState, TabState } from './types';
export declare const fromSavedObjectTabToTabState: ({ tab, existingTab, initialAppState, }: {
    tab: DiscoverSessionTab;
    existingTab?: TabState;
    initialAppState?: DiscoverAppState;
}) => TabState;
export declare const fromSavedObjectTabToSearchSource: ({ tab, services, }: {
    tab: DiscoverSessionTab;
    services: DiscoverServices;
}) => Promise<ISearchSource>;
/**
 * @deprecated Prefer using `fromSavedObjectTabToSearchSource` to get only the search source,
 * or `fromSavedObjectTabToTabState` to get the tab state. This function creates a full
 * SavedSearch object which is often unnecessary and couples code to the legacy SavedSearch type.
 */
export declare const fromSavedObjectTabToSavedSearch: ({ tab, discoverSession, services, }: {
    discoverSession: DiscoverSession | undefined;
    tab: DiscoverSessionTab;
    services: DiscoverServices;
}) => Promise<SavedSearch>;
export declare const fromTabStateToSavedObjectTab: ({ tab, overridenTimeRestore, services, currentDataView, }: {
    tab: TabState;
    overridenTimeRestore?: boolean;
    services: DiscoverServices;
    currentDataView: DataView | undefined;
}) => DiscoverSessionTab;
/**
 * @deprecated Prefer using `fromTabStateToSavedObjectTab` which works directly with TabState.
 * This function converts from SavedSearch which couples code to the legacy SavedSearch type.
 */
export declare const fromSavedSearchToSavedObjectTab: ({ tab, savedSearch, services, }: {
    tab: Pick<TabState, "id" | "label"> & {
        attributes?: TabState["attributes"];
        globalState?: TabState["globalState"];
    };
    savedSearch: SavedSearch;
    services: DiscoverServices;
}) => DiscoverSessionTab;
