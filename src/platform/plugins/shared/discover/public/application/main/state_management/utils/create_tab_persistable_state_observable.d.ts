import { type Observable } from 'rxjs';
import { type DiscoverInternalState, type TabState } from '../redux';
export type TabPersistableState = Pick<TabState, 'appState' | 'globalState' | 'attributes' | 'profileState'>;
export declare const createTabPersistableStateObservable: ({ tabId, internalState$, getState, }: {
    tabId: string;
    internalState$: Observable<DiscoverInternalState>;
    getState: () => DiscoverInternalState;
}) => Observable<TabPersistableState>;
