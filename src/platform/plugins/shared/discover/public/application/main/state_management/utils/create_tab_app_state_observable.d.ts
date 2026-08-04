import { type Observable } from 'rxjs';
import { type DiscoverInternalState, type DiscoverAppState } from '../redux';
export declare const createTabAppStateObservable: ({ tabId, internalState$, getState, }: {
    tabId: string;
    internalState$: Observable<DiscoverInternalState>;
    getState: () => DiscoverInternalState;
}) => Observable<DiscoverAppState>;
