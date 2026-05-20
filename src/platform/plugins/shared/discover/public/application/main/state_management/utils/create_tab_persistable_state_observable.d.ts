import { type Observable } from 'rxjs';
import { type DiscoverInternalState, type TabState } from '../redux';
export declare const createTabPersistableStateObservable: ({ tabId, internalState$, getState, }: {
    tabId: string;
    internalState$: Observable<DiscoverInternalState>;
    getState: () => DiscoverInternalState;
}) => Observable<Pick<TabState, "appState" | "globalState" | "attributes">>;
