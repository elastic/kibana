import { type Observable } from 'rxjs';
import { type GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { type INullableBaseStateContainer } from '@kbn/kibana-utils-plugin/public';
import type { AnyAction, ThunkDispatch } from 'redux-toolkit-v1';
import { type DiscoverAppState, type DiscoverInternalState, type InternalStateDependencies } from '../redux';
import { type ProfileStateMap } from '../../../../../common/context_awareness';
/**
 * Create observables and state containers for 2-directional syncing of appState and globalState with the URL
 */
export declare const createUrlSyncObservables: ({ tabId, dispatch, getState, internalState$, runtimeStateManager, services, }: {
    tabId: string;
    dispatch: ThunkDispatch<DiscoverInternalState, InternalStateDependencies, AnyAction>;
    getState: () => DiscoverInternalState;
    internalState$: Observable<DiscoverInternalState>;
    runtimeStateManager: InternalStateDependencies["runtimeStateManager"];
    services: InternalStateDependencies["services"];
}) => {
    appState$: Observable<DiscoverAppState>;
    createAppStateContainer: (isSystemTriggered: boolean) => INullableBaseStateContainer<DiscoverAppState>;
    globalStateContainer: INullableBaseStateContainer<GlobalQueryStateFromUrl>;
    profileStateContainer: INullableBaseStateContainer<ProfileStateMap | undefined>;
};
