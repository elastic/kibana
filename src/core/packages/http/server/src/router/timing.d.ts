/**
 * API for recording custom timing events during request processing.
 * These events are automatically included in the Server-Timing response header.
 *
 * @public
 */
export interface RequestTiming {
    /**
     * Start timing an operation. Returns a timer object with an end() method.
     * This prevents mismatched timings when operations overlap.
     *
     * @param name - Metric name (alphanumeric, underscore, dash only)
     * @param description - Optional human-readable description
     * @returns Timer object with end() method
     *
     * @example
     * ```typescript
     * const timer = request.timing.start('es-query', 'Elasticsearch query');
     * const results = await elasticsearch.search(query);
     * timer.end();
     * ```
     */
    start(name: string, description?: string): Timer;
    /**
     * Manually record a timing event with explicit duration.
     * Use when you already have the duration calculated.
     *
     * @param name - Metric name (alphanumeric, underscore, dash only)
     * @param duration - Duration in milliseconds
     * @param description - Optional human-readable description
     *
     * @example
     * ```typescript
     * const start = performance.now();
     * await processData();
     * request.timing.measure('processing', performance.now() - start, 'Data transform');
     * ```
     */
    measure(name: string, duration: number, description?: string): void;
    /**
     * Get all recorded timing events (internal use)
     * @internal
     */
    getEvents(): readonly TimingEvent[];
}
/**
 * Timer object returned by RequestTiming.start()
 *
 * @public
 */
export interface Timer {
    /**
     * End timing for this specific operation.
     * Can be called multiple times (subsequent calls are no-ops).
     */
    end(): void;
}
/**
 * A recorded timing event
 *
 * @public
 */
export interface TimingEvent {
    /** Metric name */
    name: string;
    /** Duration in milliseconds */
    duration: number;
    /** Optional human-readable description */
    description?: string;
}
