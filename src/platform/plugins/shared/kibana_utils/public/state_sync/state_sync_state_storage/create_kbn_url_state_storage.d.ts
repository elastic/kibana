import { Observable } from 'rxjs';
import type { History } from 'history';
import type { IStateStorage } from './types';
import type { IKbnUrlControls } from '../../state_management/url';
/**
 * KbnUrlStateStorage is a state storage for {@link syncState} utility which:
 *
 * 1. Keeps state in sync with the URL.
 * 2. Serializes data and stores it in the URL in one of the supported formats:
 *   * Rison encoded.
 *   * Hashed URL: In URL we store only the hash from the serialized state, but the state itself is stored in sessionStorage. See Kibana's `state:storeInSessionStorage` advanced option for more context.
 * 3. Takes care of listening to the URL updates and notifies state about the updates.
 * 4. Takes care of batching URL updates to prevent redundant browser history records.
 *
 * {@link https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/kibana_utils/docs/state_sync/storages/kbn_url_storage.md | Refer to this guide for more info}
 * @public
 */
export interface IKbnUrlStateStorage extends IStateStorage {
    set: <State>(key: string, state: State, opts?: {
        replace: boolean;
    }) => Promise<string | undefined>;
    get: <State = unknown>(key: string) => State | null;
    change$: <State = unknown>(key: string) => Observable<State | null>;
    /**
     * Cancels any pending url updates
     */
    cancel: () => void;
    /**
     * Lower level wrapper around history library that handles batching multiple URL updates into one history change
     */
    kbnUrlControls: IKbnUrlControls;
}
/**
 * Creates {@link IKbnUrlStateStorage} state storage
 * @returns - {@link IKbnUrlStateStorage}
 * @public
 */
export declare const createKbnUrlStateStorage: ({ useHash, useHashQuery, history, onGetError, onSetError, }?: {
    useHash: boolean;
    useHashQuery?: boolean;
    history?: History;
    onGetError?: (error: Error) => void;
    onSetError?: (error: Error) => void;
}) => IKbnUrlStateStorage;
