import type { SerializableRecord } from '@kbn/utility-types';
/**
 * Field-level lifetime preference for profile state values.
 */
export declare enum ProfileStateType {
    /**
     * Ephemeral UI state for the current host/session.
     */
    Ui = "ui",
    /**
     * URL-addressable state when the host supports URL syncing.
     */
    Url = "url",
    /**
     * Persisted state when the host supports state persistence.
     */
    Persistent = "persistent"
}
/**
 * Describes the intended lifetime for each field in a profile state definition.
 */
export type ProfileStateDescriptor<TState extends SerializableRecord> = {
    [key in keyof TState]: {
        type: ProfileStateType;
    };
};
/**
 * Typed state definition registered by profile providers and consumed via
 * `ContextAwarenessToolkit.getStateAdapter`.
 */
export interface ProfileStateDefinition<TState extends SerializableRecord> {
    /**
     * Unique storage key for this profile state blob.
     */
    key: string;
    /**
     * Field-level lifetime metadata for this state shape.
     */
    descriptor: ProfileStateDescriptor<TState>;
    /**
     * Typed fallback returned before any host state has been written.
     */
    defaultState: TState;
}
/**
 * A map of profile state blobs keyed by their registered definition key.
 */
export type ProfileStateMap = Record<string, SerializableRecord | undefined>;
/**
 * Controls how registered default values are handled when filtering profile state.
 */
export type ProfileStateDefaultsHandling = 'none' | 'expand' | 'strip';
/**
 * Registry of profile state definitions supported by Discover.
 */
export declare class ProfileStateRegistry {
    private readonly stateDefinitions;
    /**
     * Registers a profile state definition. Keys must be globally unique.
     */
    registerDefinition<TState extends SerializableRecord>(definition: ProfileStateDefinition<TState>): void;
    /**
     * Returns true when the requested definition matches the registered descriptor and default state.
     */
    hasDefinition<TState extends SerializableRecord>(definition: ProfileStateDefinition<TState>): boolean;
    /**
     * Filters a profile state map by field lifetime type. Unregistered state keys and entries with no
     * matching fields are omitted from the returned map.
     *
     * When `defaultsHandling` is `expand`, each returned entry is merged over the registered default
     * fields for the requested state types. When `defaultsHandling` is `strip`, default-valued fields
     * are omitted from returned entries.
     */
    pickStateByType({ profileStateMap, stateTypes, defaultsHandling, }: {
        profileStateMap: ProfileStateMap | undefined;
        stateTypes: ProfileStateType[];
        defaultsHandling?: ProfileStateDefaultsHandling;
    }): ProfileStateMap;
    /**
     * Merges registered profile state maps in argument order. Later maps override earlier fields for
     * the same registered state key. Unregistered state keys and fields are omitted.
     */
    mergeState(...profileStateMaps: Array<ProfileStateMap | null | undefined>): ProfileStateMap;
    /**
     * Filters one profile state object by field lifetime type using the registered definition for
     * `stateKey`.
     *
     * Returns `undefined` when the state key is not registered, the state is missing, or no fields
     * match the requested type. When `defaultsHandling` is `expand`, the matching fields are merged
     * over the registered default fields for the requested state types. When `defaultsHandling` is
     * `strip`, fields equal to the registered defaults are omitted.
     */
    filterFieldsByType<TState extends SerializableRecord>({ profileState, stateKey, stateTypes, defaultsHandling, }: {
        profileState: Partial<TState> | undefined;
        stateKey: ProfileStateDefinition<TState>['key'];
        stateTypes: ProfileStateType[] | Set<ProfileStateType>;
        defaultsHandling?: ProfileStateDefaultsHandling;
    }): Partial<TState> | undefined;
}
