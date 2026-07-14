export type CounterEventSource = 'server' | 'ui';
export interface AbstractCounter {
    /** The domainId used to create the Counter API */
    domainId: string;
    /** The name of the counter */
    counterName: string;
    /** The type of counter (defaults to 'count') */
    counterType: string;
    /** The source of this counter: 'server' | 'ui' */
    source: CounterEventSource;
    /** Namespace associated to this counter */
    namespace?: string;
}
export interface CounterMetric extends AbstractCounter {
    /** Amount of units to increment this counter */
    incrementBy: number;
}
/**
 * Details about the counter to be incremented
 */
export interface IncrementCounterParams {
    /** The namespace to increment this counter on */
    namespace?: string;
    /** The name of the counter **/
    counterName: string;
    /** The counter type ("count" by default) **/
    counterType?: string;
    /** The source of the event we are counting */
    source?: CounterEventSource;
    /** Increment the counter by this number (1 if not specified) **/
    incrementBy?: number;
}
