import type { TabActionPayload, InternalStateThunkActionCreator } from '../internal_state';
/**
 * Initializing state containers and start subscribing to changes triggering e.g. data fetching
 */
export declare const initializeAndSync: InternalStateThunkActionCreator<[TabActionPayload]>;
/**
 * Stop syncing the state containers started by initializeAndSync
 */
export declare const stopSyncing: InternalStateThunkActionCreator<[TabActionPayload]>;
