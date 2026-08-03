import type { UserProfileEntry, ContentListUserProfilesServices } from './types';
type BulkResolveFn = ContentListUserProfilesServices['bulkResolve'];
/**
 * A stable, session-scoped cache for user profiles.
 *
 * Replaces the previous `useState<Map>`-based `UserProfileStore` with a plain
 * class that avoids React state identity changes on every cache update. Uses
 * `useSyncExternalStore` for reactivity: only subscribers re-render when
 * profiles are loaded.
 *
 * Key properties:
 * - **Stable reference**: created once via `useRef`, never changes identity.
 * - **`requested` set**: tracks in-flight requests so concurrent callers don't
 *   issue duplicate `bulkResolve` calls. UIDs omitted from a response are
 *   cleared so future calls can retry.
 * - **Built-in batcher**: `loadOne` batches individual requests within a 50ms
 *   window via `createBatcher`.
 * - **No React dependencies**: can be extracted to core later.
 */
export declare class ProfileCache {
    private readonly bulkResolve;
    private cache;
    private requested;
    private listeners;
    private version;
    private batcher;
    constructor(bulkResolve: BulkResolveFn);
    /** Synchronous lookup by UID. Returns `undefined` if not cached. */
    resolve(uid: string): UserProfileEntry | undefined;
    /** Get all cached profiles. */
    getAll(): UserProfileEntry[];
    /**
     * Bulk load with in-flight dedup via `requested` set.
     *
     * UIDs already in the cache or previously requested are skipped. This makes
     * concurrent calls from priming, facets, and cells safe without external
     * dedup logic.
     */
    ensureLoaded(uids: string[]): Promise<void>;
    /**
     * Single UID load — batched via `createBatcher` (50ms window).
     *
     * Multiple cells mounting in the same frame get their `loadOne` calls
     * batched into one `bulkResolve`.
     */
    loadOne(uid: string): Promise<UserProfileEntry | undefined>;
    /**
     * Inject already-resolved profiles into the cache without a network call.
     *
     * Use when profiles have been fetched through an external path (e.g. a
     * custom `FilterFacetConfig.getFacets`) and should be available for
     * synchronous lookups via `resolve`/`getAll`. Does not overwrite existing
     * entries.
     */
    seed(entries: UserProfileEntry[]): void;
    /** Subscribe to cache changes. Returns an unsubscribe function. */
    subscribe: (listener: () => void) => (() => void);
    /** Returns the current version (increments on every merge). */
    getSnapshot: () => number;
    /** Add entries to cache, bump version, notify subscribers. */
    private merge;
}
export {};
