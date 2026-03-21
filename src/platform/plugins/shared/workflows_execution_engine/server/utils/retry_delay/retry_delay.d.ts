/**
 * Configuration for retry delay computation.
 * Matches the retry section of workflow on-failure config (delay, strategy, multiplier, max-delay, jitter).
 */
export interface RetryDelayConfig {
    /** Fixed delay duration (e.g. "5s", "1m"). Used as initial delay for exponential. */
    delay?: string;
    /** Strategy: fixed (same delay each retry) or exponential backoff. Default: fixed. */
    strategy?: 'fixed' | 'exponential';
    /** Multiplier for exponential backoff. Default: 2. Ignored when strategy is fixed. */
    multiplier?: number;
    /** Cap for exponential backoff (e.g. "5m"). Ignored when strategy is fixed. */
    'max-delay'?: string;
    /** Add jitter to delay. Default: false. */
    jitter?: boolean;
}
/**
 * Computes the delay in milliseconds before the next retry attempt.
 *
 * @param config - Retry delay configuration (strategy, delay, multiplier, max-delay, jitter).
 * @param attempt - Zero-based index of the attempt that just failed (0 = first failure, 1 = second failure, etc.).
 * @returns Delay in milliseconds. Returns 0 when no delay is configured or delay would be 0.
 */
export declare function computeRetryDelayMs(config: RetryDelayConfig, attempt: number): number;
