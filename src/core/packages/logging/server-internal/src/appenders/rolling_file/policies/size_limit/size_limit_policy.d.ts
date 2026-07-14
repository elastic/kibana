import type { LogRecord } from '@kbn/logging';
import type { SizeLimitTriggeringPolicyConfig } from '@kbn/core-logging-server';
import type { RollingFileContext } from '../../rolling_file_context';
import type { TriggeringPolicy } from '../policy';
export declare const sizeLimitTriggeringPolicyConfigSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"size-limit">;
    size: import("@kbn/config-schema").Type<import("@kbn/config-schema").ByteSizeValue>;
}>;
/**
 * A triggering policy based on a fixed size limit.
 *
 * Will trigger a rollover when the current log size exceed the
 * given {@link SizeLimitTriggeringPolicyConfig.size | size}.
 */
export declare class SizeLimitTriggeringPolicy implements TriggeringPolicy {
    private readonly context;
    private readonly maxFileSize;
    constructor(config: SizeLimitTriggeringPolicyConfig, context: RollingFileContext);
    isTriggeringEvent(record: LogRecord): boolean;
}
