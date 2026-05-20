import type { IStateStorage } from './types';
/**
 * {@link IStateStorage} for storing state in browser {@link Storage}
 * {@link https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/kibana_utils/docs/state_sync/storages/session_storage.md | guide}
 * @public
 */
export interface ISessionStorageStateStorage extends IStateStorage {
    set: <State>(key: string, state: State) => void;
    get: <State = unknown>(key: string) => State | null;
}
/**
 * Creates {@link ISessionStorageStateStorage}
 * {@link https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/kibana_utils/docs/state_sync/storages/session_storage.md | guide}
 * @param storage - Option {@link Storage} to use for storing state. By default window.sessionStorage.
 * @returns - {@link ISessionStorageStateStorage}
 * @public
 */
export declare const createSessionStorageStateStorage: (storage?: Storage) => ISessionStorageStateStorage;
