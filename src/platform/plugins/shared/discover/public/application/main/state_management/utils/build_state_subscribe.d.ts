import { type InternalStateDispatch, type RuntimeStateManager, type TabState, type DiscoverInternalState } from '../redux';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverDataStateContainer } from '../discover_data_state_container';
import type { DiscoverAppState } from '../redux';
/**
 * Builds a subscribe function for the app state, that is executed when the app state changes in URL
 * or programmatically. Its main purpose is to detect which changes should trigger a refetch of the data.
 */
export declare const buildStateSubscribe: ({ dataState, dispatch, getState, runtimeStateManager, services, getCurrentTab, }: {
    dataState: DiscoverDataStateContainer;
    dispatch: InternalStateDispatch;
    getState: () => DiscoverInternalState;
    runtimeStateManager: RuntimeStateManager;
    services: DiscoverServices;
    getCurrentTab: () => TabState;
}) => (nextState: DiscoverAppState) => Promise<void>;
