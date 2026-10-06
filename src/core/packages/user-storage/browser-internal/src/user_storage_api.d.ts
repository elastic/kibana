import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
/**
 * Thin HTTP wrapper over the user-storage internal routes. Each method maps
 * to one HTTP round-trip; no caching.
 *
 * @internal
 */
export declare class UserStorageApi {
    private readonly http;
    constructor(http: InternalHttpSetup);
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<unknown>;
    remove(key: string): Promise<void>;
}
