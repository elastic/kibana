import { type Observable } from 'rxjs';
import { type GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { type INullableBaseStateContainer } from '@kbn/kibana-utils-plugin/public';
import type { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { type DiscoverAppState, type DiscoverInternalState, type InternalStateDependencies } from '../redux';
/**
 * Create observables and state containers for 2-directional syncing of appState and globalState with the URL
 */
export declare const createUrlSyncObservables: ({ tabId, dispatch, getState, internalState$, }: {
    tabId: string;
    dispatch: ThunkDispatch<DiscoverInternalState, InternalStateDependencies, AnyAction>;
    getState: () => DiscoverInternalState;
    internalState$: Observable<DiscoverInternalState>;
}) => {
    appState$: Observable<DiscoverAppState>;
    createAppStateContainer: (isSystemTriggered: boolean) => INullableBaseStateContainer<DiscoverAppState>;
    globalStateContainer: INullableBaseStateContainer<GlobalQueryStateFromUrl>;
};
