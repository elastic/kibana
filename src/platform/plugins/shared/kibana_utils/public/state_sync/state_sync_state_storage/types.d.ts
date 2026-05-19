import type { Observable } from 'rxjs';
/**
 * Any StateStorage have to implement IStateStorage interface
 * StateStorage is responsible for:
 * * state serialisation / deserialization
 * * persisting to and retrieving from storage
 *
 * For an example take a look at already implemented {@link IKbnUrlStateStorage} and {@link ISessionStorageStateStorage} state storages
 * @public
 */
export interface IStateStorage {
    /**
     * Take in a state object, should serialise and persist
     */
    set: <State>(key: string, state: State) => any;
    /**
     * Should retrieve state from the storage and deserialize it
     */
    get: <State = unknown>(key: string) => State | null;
    /**
     * Should notify when the stored state has changed
     */
    change$?: <State = unknown>(key: string) => Observable<State | null>;
    /**
     * Optional method to cancel any pending activity
     * {@link syncState} will call it during destroy, if it is provided by IStateStorage
     */
    cancel?: () => void;
}
