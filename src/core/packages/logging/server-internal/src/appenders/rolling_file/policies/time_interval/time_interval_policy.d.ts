import type { LogRecord } from '@kbn/logging';
import type { TimeIntervalTriggeringPolicyConfig } from '@kbn/core-logging-server';
import type { RollingFileContext } from '../../rolling_file_context';
import type { TriggeringPolicy } from '../policy';
export declare const timeIntervalTriggeringPolicyConfigSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"time-interval">;
    interval: import("@kbn/config-schema").Type<import("moment").Duration>;
    modulate: import("@kbn/config-schema").Type<boolean>;
}>;
/**
 * A triggering policy based on a fixed time interval
 */
export declare class TimeIntervalTriggeringPolicy implements TriggeringPolicy {
    private readonly config;
    /**
     * milliseconds timestamp of when the next rollover should occur.
     */
    private nextRolloverTime;
    constructor(config: TimeIntervalTriggeringPolicyConfig, context: RollingFileContext);
    isTriggeringEvent(record: LogRecord): boolean;
}
