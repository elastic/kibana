import type { EventLoopUtilization } from 'perf_hooks';
export declare class EventLoopUtilizationMonitor {
    private elu;
    /**
     * Creating a new instance of EventLoopUtilizationMonitor will capture the
     * current ELU to use as a point of comparison against the first call to
     * `collect`.
     */
    constructor();
    /**
     * Get ELU between now and last time the ELU was reset.
     */
    collect(): EventLoopUtilization;
    /**
     * Resets the ELU to now. Will be used to calculate the diff on the next call to `collect`.
     */
    reset(): void;
}
