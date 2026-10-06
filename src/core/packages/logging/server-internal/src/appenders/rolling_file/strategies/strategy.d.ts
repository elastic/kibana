/**
 * A strategy to perform the log file rollover.
 */
export interface RollingStrategy {
    /**
     * Performs the rollout
     */
    rollout(): Promise<void>;
}
