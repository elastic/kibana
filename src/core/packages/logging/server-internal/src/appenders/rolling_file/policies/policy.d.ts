import type { LogRecord } from '@kbn/logging';
/**
 * A policy used to determinate when a rollout should be performed.
 */
export interface TriggeringPolicy {
    /**
     * Determines whether a rollover should occur before logging given record.
     **/
    isTriggeringEvent(record: LogRecord): boolean;
}
