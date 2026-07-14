import type { RetentionPolicyConfig } from '@kbn/core-logging-server';
import type { RollingFileContext } from '../rolling_file_context';
export declare const retentionPolicyConfigSchema: import("@kbn/config-schema").ObjectType<{
    maxFiles: import("@kbn/config-schema").Type<number | undefined>;
    maxAccumulatedFileSize: import("@kbn/config-schema").Type<import("@kbn/config-schema").ByteSizeValue | undefined>;
    removeOlderThan: import("@kbn/config-schema").Type<import("moment").Duration | undefined>;
}>;
export interface RetentionPolicy {
    /**
     * Apply the configured policy, checking the existing log files bound to the appender
     * and disposing of those that should.
     */
    apply(): Promise<void>;
}
export declare class GenericRetentionPolicy implements RetentionPolicy {
    private readonly config;
    private readonly context;
    private readonly logFileFolder;
    constructor(config: RetentionPolicyConfig, context: RollingFileContext);
    apply(): Promise<void>;
}
