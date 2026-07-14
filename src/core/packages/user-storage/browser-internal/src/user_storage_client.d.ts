import { Observable } from 'rxjs';
import type { IUserStorageClient, UserStorageUpdate } from '@kbn/core-user-storage-browser';
import type { UserStorageApi } from './user_storage_api';
export interface UserStorageClientParams {
    api: UserStorageApi;
    initialValues: Record<string, unknown>;
    done$: Observable<unknown>;
}
/**
 * Browser-side {@link IUserStorageClient}: a synchronous in-memory cache
 * seeded from preloaded (server-injected) metadata (for keys with `preload: true`),
 * with HTTP-backed writes and per-key lazy fetching for non-injected keys.
 *
 * Lazy fetch behaviour:
 * - The first `get(key)` / `get$(key)` call for a key that is absent from
 *   the cache triggers a fire-and-forget `GET /internal/user_storage/{key}`
 *   request. Once the response arrives, the cache is populated and `get$`
 *   subscribers for that key receive the resolved value.
 * - Fetch failures are published to `getHttpError$` but do not cause `get$`
 *   to error or complete. The cache entry remains absent.
 * - `getUpdate$()` does **not** emit for lazy-fetch hydrations; only explicit
 *   `set` / `remove` calls produce update events.
 *
 * @internal
 */
export declare class UserStorageClient implements IUserStorageClient {
    private cache;
    private readonly api;
    private readonly update$;
    private readonly httpErrors$;
    /** Emits whenever the cache is hydrated by a lazy fetch. */
    private readonly loaded$;
    /** Set of keys for which a lazy fetch has already been initiated. */
    private readonly fetchInitiated;
    constructor({ api, initialValues, done$ }: UserStorageClientParams);
    peek<T = unknown>(key: string): T | undefined;
    peek<T = unknown>(key: string, defaultValue: T): T;
    get<T = unknown>(key: string): T | undefined;
    get<T = unknown>(key: string, defaultValue: T): T;
    get$<T = unknown>(key: string): Observable<T | undefined>;
    get$<T = unknown>(key: string, defaultValue: T): Observable<T>;
    set<T = unknown>(key: string, value: T): Promise<T>;
    remove(key: string): Promise<void>;
    getUpdate$(): Observable<UserStorageUpdate>;
    getHttpError$(): Observable<Error>;
    /**
     * Initiates a single fire-and-forget GET for `key` if it is not yet cached
     * and no prior fetch has been triggered for it in the lifetime of this client.
     */
    private triggerLazyFetch;
}
