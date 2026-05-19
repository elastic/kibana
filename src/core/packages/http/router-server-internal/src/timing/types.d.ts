import type { TimingEvent } from '@kbn/core-http-server';
/**
 * Internal state for request timing
 * @internal
 */
export interface RequestTimingState {
    events: TimingEvent[];
}
