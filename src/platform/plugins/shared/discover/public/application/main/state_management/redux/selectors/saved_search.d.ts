import type { SavedSearchByValueAttributes } from '@kbn/saved-search-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { type RuntimeStateManager } from '../runtime_state';
import type { DiscoverInternalState } from '../types';
import type { DiscoverServices } from '../../../../../build_services';
export declare const selectTabSavedSearch: ({ tabId, getState, runtimeStateManager, services, }: {
    tabId: string;
    getState: () => DiscoverInternalState;
    runtimeStateManager: RuntimeStateManager;
    services: DiscoverServices;
}) => Promise<SavedSearch>;
export declare const selectTabSavedSearchByValueAttributes: ({ getState, runtimeStateManager, services, tabId, }: {
    getState: () => DiscoverInternalState;
    runtimeStateManager: RuntimeStateManager;
    services: DiscoverServices;
    tabId: string;
}) => Promise<SavedSearchByValueAttributes>;
