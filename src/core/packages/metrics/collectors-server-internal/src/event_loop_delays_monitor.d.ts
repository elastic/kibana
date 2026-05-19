import type { IntervalHistogram, IEventLoopDelaysMonitor } from '@kbn/core-metrics-server';
/**
 * Nanosecond to milisecond conversion unit
 */
export declare const ONE_MILLISECOND_AS_NANOSECONDS = 1000000;
/**
 * Converts time metric from ns to ms
 **/
export declare function nsToMs(metric: number): number;
export declare class EventLoopDelaysMonitor implements IEventLoopDelaysMonitor {
    private readonly loopMonitor;
    private fromTimestamp;
    /**
     * Creating a new instance from EventLoopDelaysMonitor will
     * automatically start tracking event loop delays.
     */
    constructor();
    /**
     * Collect gathers event loop delays metrics from nodejs perf_hooks.monitorEventLoopDelay
     * the histogram calculations start from the last time `reset` was called or this
     * EventLoopDelaysMonitor instance was created.
     *
     * Returns metrics in milliseconds.
  
     * @returns {IntervalHistogram}
     */
    collect(): IntervalHistogram;
    /**
     * Resets the collected histogram data.
     */
    reset(): void;
    /**
     * Disables updating the interval timer for collecting new data points.
     */
    stop(): void;
}
