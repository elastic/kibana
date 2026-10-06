import type { LogRecord, DisposableAppender } from '@kbn/logging';
import type { RollingFileAppenderPluginConfig } from '@kbn/core-logging-server';
/**
 * Appender that formats all the `LogRecord` instances it receives and writes them to the specified file.
 * @internal
 */
export declare class RollingFileAppender implements DisposableAppender {
    static configSchema: import("@kbn/config-schema").ObjectType<{
        type: import("@kbn/config-schema").Type<"rolling-file">;
        layout: import("@kbn/config-schema").Type<Readonly<{} & {
            type: "json";
        }> | Readonly<{
            highlight?: boolean | undefined;
            pattern?: string | undefined;
        } & {
            type: "pattern";
        }>>;
        fileName: import("@kbn/config-schema").Type<string>;
        policy: import("@kbn/config-schema").Type<Readonly<{} & {
            type: "size-limit";
            size: import("@kbn/config-schema").ByteSizeValue;
        }> | Readonly<{} & {
            type: "time-interval";
            interval: import("moment").Duration;
            modulate: boolean;
        }>>;
        strategy: import("@kbn/config-schema").Type<Readonly<{} & {
            type: "numeric";
            pattern: string;
            max: number;
        }>>;
        retention: import("@kbn/config-schema").Type<Readonly<{
            maxFiles?: number | undefined;
            maxAccumulatedFileSize?: import("@kbn/config-schema").ByteSizeValue | undefined;
            removeOlderThan?: import("moment").Duration | undefined;
        } & {}> | undefined>;
    }>;
    /**
     * {@link RollingFileAppender.configSchema} plus the plugin-only `onWriteError` handler; used only
     * by the {@link LoggingServiceSetup.configure} validation path, never wired into YAML config.
     */
    static runtimeConfigSchema: import("@kbn/config-schema").ObjectType<Omit<{
        type: import("@kbn/config-schema").Type<"rolling-file">;
        layout: import("@kbn/config-schema").Type<Readonly<{} & {
            type: "json";
        }> | Readonly<{
            highlight?: boolean | undefined;
            pattern?: string | undefined;
        } & {
            type: "pattern";
        }>>;
        fileName: import("@kbn/config-schema").Type<string>;
        policy: import("@kbn/config-schema").Type<Readonly<{} & {
            type: "size-limit";
            size: import("@kbn/config-schema").ByteSizeValue;
        }> | Readonly<{} & {
            type: "time-interval";
            interval: import("moment").Duration;
            modulate: boolean;
        }>>;
        strategy: import("@kbn/config-schema").Type<Readonly<{} & {
            type: "numeric";
            pattern: string;
            max: number;
        }>>;
        retention: import("@kbn/config-schema").Type<Readonly<{
            maxFiles?: number | undefined;
            maxAccumulatedFileSize?: import("@kbn/config-schema").ByteSizeValue | undefined;
            removeOlderThan?: import("moment").Duration | undefined;
        } & {}> | undefined>;
    }, "onWriteError"> & {
        onWriteError: import("@kbn/config-schema").Type<any>;
    }>;
    private isRolling;
    private disposed;
    private rollingPromise?;
    private readonly layout;
    private readonly context;
    private readonly fileManager;
    private readonly triggeringPolicy;
    private readonly rollingStrategy;
    private readonly retentionPolicy;
    private readonly buffer;
    constructor(config: RollingFileAppenderPluginConfig);
    /**
     * Formats specified `record` and writes it to the specified file. If the record
     * would trigger a rollover, it will be performed before the effective write operation.
     */
    append(record: LogRecord): void;
    private _writeToFile;
    /**
     * Disposes the appender.
     * If a rollout is currently in progress, it will be awaited.
     */
    dispose(): Promise<void>;
    private performRollout;
    private flushBuffer;
    /**
     * Checks if the current event should trigger a rollout
     */
    private needRollout;
}
