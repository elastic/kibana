import type { SerializableRecord } from '@kbn/utility-types';
import type { Observable } from 'rxjs';
import type { ProfileStateDefinition, ProfileStateRegistry } from '../../common/context_awareness';
/** Options controlling how a profile state mutation is applied by its host. */
export interface ProfileStateMutationOptions {
    /**
     * Controls how URL-backed hosts update browser history for this mutation.
     */
    historyMethod?: 'push' | 'replace';
}
/**
 * Host-backed profile state API exposed to profile extension point implementations.
 */
export interface ProfileStateAdapter<TState extends SerializableRecord> {
    /**
     * Returns the current state, falling back to the definition's default state before any value is
     * written by the host.
     */
    getState: () => TState;
    /**
     * Emits the current state and subsequent state changes.
     */
    getState$: () => Observable<TState>;
    /**
     * Replaces the full state value.
     */
    setState: (state: TState, options?: ProfileStateMutationOptions) => void;
    /**
     * Applies a shallow immutable update to the current state.
     */
    updateState: (stateUpdate: Partial<TState>, options?: ProfileStateMutationOptions) => void;
}
/**
 * Creates a definition-validated, cached adapter factory for host-specific state adapters.
 */
export declare const createProfileStateAdapterFactory: ({ createAdapter, profileStateRegistry, }: {
    createAdapter: <TState extends SerializableRecord>(definition: ProfileStateDefinition<TState>) => ProfileStateAdapter<TState>;
    profileStateRegistry: ProfileStateRegistry;
}) => <TState extends SerializableRecord>(definition: ProfileStateDefinition<TState>) => ProfileStateAdapter<TState>;
