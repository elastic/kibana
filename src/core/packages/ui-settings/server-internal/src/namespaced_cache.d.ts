export declare const NAMESPACED_CACHE_TTL = 10000;
/**
 * Shared process-wide cache for namespace-keyed data with configurable TTL.
 * Used to cache getUserProvided() results across IUiSettingsClient instances.
 *
 * Includes in-flight request deduplication to prevent thundering herd when
 * multiple concurrent requests fetch the same namespace's data.
 *
 * @internal
 */
export declare class NamespacedCache<T = unknown> {
    private readonly entries;
    private readonly inflightReads;
    /**
     * Get cached value for a specific namespace
     */
    get(namespace: string): T | null;
    /**
     * Set cached value with TTL
     */
    set(namespace: string, value: T, ttl?: number): void;
    /**
     * Delete cached value and clear any in-flight promises.
     * This ensures cache invalidation also prevents stale in-flight requests.
     */
    del(namespace: string): void;
    /**
     * Clear all cached values and in-flight promises
     */
    clear(): void;
    /**
     * Get in-flight read promise for a specific namespace.
     * Used for request deduplication - caller receives the actual result.
     */
    getInflightRead(namespace: string): Promise<T> | null;
    /**
     * Set in-flight promise for a specific namespace.
     * The promise is automatically removed when it resolves or rejects.
     */
    setInflightRead(namespace: string, promise: Promise<T>): void;
    /**
     * Check if a namespace has a cached value
     */
    has(namespace: string): boolean;
}
