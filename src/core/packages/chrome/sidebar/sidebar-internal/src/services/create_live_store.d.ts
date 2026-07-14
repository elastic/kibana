import type { Observable } from 'rxjs';
import type { SidebarStoreConfig, SidebarContext } from '@kbn/core-chrome-sidebar';
/** Minimal storage interface for sidebar stores */
export interface SidebarStorage {
    get<T>(key: string): T | null;
    set<T>(key: string, value: T): void;
}
/** Live store instance - holds state and bound actions */
export interface LiveStore<TState, TActions> {
    getState: () => TState;
    getState$: () => Observable<TState>;
    actions: TActions;
}
/**
 * Create a live store instance from a store configuration.
 * Handles storage restore, Zod validation, BehaviorSubject creation, and action binding.
 */
export declare function createLiveStore<TState, TActions>(appId: string, config: SidebarStoreConfig<TState, TActions>, storage: SidebarStorage, context: SidebarContext): LiveStore<TState, TActions>;
