import type { IStateSyncConfig } from './types';
import type { IStateStorage } from './state_sync_state_storage';
import type { BaseState } from '../../common/state_containers';
/**
 * @public
 */
export type StopSyncStateFnType = () => void;
/**
 * @public
 */
export type StartSyncStateFnType = () => void;
/**
 * @public
 */
export interface ISyncStateRef<StateStorage extends IStateStorage = IStateStorage> {
    /**
     * stop state syncing
     */
    stop: StopSyncStateFnType;
    /**
     * start state syncing
     */
    start: StartSyncStateFnType;
}
/**
 * Utility for syncing application state wrapped in state container
 * with some kind of storage (e.g. URL)
 *
 * Go {@link https://github.com/elastic/kibana/tree/main/src/platform/plugins/shared/kibana_utils/docs/state_sync | here} for a complete guide and examples.
 *
 * @example
 *
 * the simplest use case
 * ```ts
 * const stateStorage = createKbnUrlStateStorage();
 * syncState({
 *   storageKey: '_s',
 *   stateContainer,
 *   stateStorage
 * });
 * ```
 *
 * @example
 * conditionally configuring sync strategy
 * ```ts
 * const stateStorage = createKbnUrlStateStorage({useHash: config.get('state:stateContainerInSessionStorage')})
 * syncState({
 *   storageKey: '_s',
 *   stateContainer,
 *   stateStorage
 * });
 * ```
 *
 * @example
 * implementing custom sync strategy
 * ```ts
 * const localStorageStateStorage = {
 *   set: (storageKey, state) => localStorage.setItem(storageKey, JSON.stringify(state)),
 *   get: (storageKey) => localStorage.getItem(storageKey) ? JSON.parse(localStorage.getItem(storageKey)) : null
 * };
 * syncState({
 *   storageKey: '_s',
 *   stateContainer,
 *   stateStorage: localStorageStateStorage
 * });
 * ```
 *
 * @example
 * transforming state before serialising
 *  Useful for:
 *  * Migration / backward compatibility
 *  * Syncing part of state
 *  * Providing default values
 * ```ts
 * const stateToStorage = (s) => ({ tab: s.tab });
 * syncState({
 *   storageKey: '_s',
 *   stateContainer: {
 *     get: () => stateToStorage(stateContainer.get()),
 *     set: stateContainer.set(({ tab }) => ({ ...stateContainer.get(), tab }),
 *     state$: stateContainer.state$.pipe(map(stateToStorage))
 *   },
 *   stateStorage
 * });
 * ```
 *
 * @param - syncing config {@link IStateSyncConfig}
 * @returns - {@link ISyncStateRef}
 * @public
 */
export declare function syncState<State extends BaseState, StateStorage extends IStateStorage = IStateStorage>({ storageKey, stateStorage, stateContainer, }: IStateSyncConfig<State, IStateStorage>): ISyncStateRef;
/**
 * @example
 * sync multiple different sync configs
 * ```ts
 * syncStates([
 *   {
 *     storageKey: '_s1',
 *     stateStorage: stateStorage1,
 *     stateContainer: stateContainer1,
 *   },
 *   {
 *     storageKey: '_s2',
 *     stateStorage: stateStorage2,
 *     stateContainer: stateContainer2,
 *   },
 * ]);
 * ```
 * @param stateSyncConfigs - Array of {@link IStateSyncConfig} to sync
 */
export declare function syncStates(stateSyncConfigs: Array<IStateSyncConfig<any>>): ISyncStateRef;
