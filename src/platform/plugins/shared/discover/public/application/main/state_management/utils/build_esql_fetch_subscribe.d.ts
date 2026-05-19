import type { DataDocumentsMsg, SavedSearchData } from '../discover_data_state_container';
import type { InternalStateStore, TabActionInjector, TabState } from '../redux';
export declare const buildEsqlFetchSubscribe: ({ internalState, dataSubjects, getCurrentTab, injectCurrentTab, }: {
    internalState: InternalStateStore;
    dataSubjects: SavedSearchData;
    getCurrentTab: () => TabState;
    injectCurrentTab: TabActionInjector;
}) => {
    esqlFetchSubscribe: (next: DataDocumentsMsg) => Promise<void>;
    cleanupEsql: () => void;
};
