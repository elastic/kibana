export interface CacheManagerConfig {
    cacheDurationMs: number;
}
export declare class CacheManager {
    private readonly cache;
    constructor({ cacheDurationMs }: CacheManagerConfig);
    /**
     * Cache an object by key
     */
    setCache: (cacheKey: string, data: unknown) => void;
    /**
     * returns cached object. If the key is not found will return undefined.
     */
    getFromCache: <T = unknown>(cacheKey: string) => T | undefined;
    /**
     * Removes all cached objects
     */
    resetCache(): void;
}
