import type { RequestTiming, Timer, TimingEvent } from '@kbn/core-http-server';
import type { RequestTimingState } from './types';
/**
 * Internal implementation of the RequestTiming API
 * @internal
 */
export declare class RequestTimingImpl implements RequestTiming {
    private readonly state;
    constructor(state: RequestTimingState);
    start(name: string, description?: string): Timer;
    measure(name: string, duration: number, description?: string): void;
    getEvents(): readonly TimingEvent[];
}
