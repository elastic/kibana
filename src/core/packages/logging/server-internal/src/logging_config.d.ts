import type { TypeOf } from '@kbn/config-schema';
import type { AppenderConfigType, LoggerConfigType } from '@kbn/core-logging-server';
/**
 * Config schema for validating the `loggers` key in {@link LoggerContextConfigType} or {@link LoggingConfigType}.
 *
 * @public
 */
export declare const loggerSchema: import("@kbn/config-schema").ObjectType<{
    appenders: import("@kbn/config-schema").Type<string[]>;
    name: import("@kbn/config-schema").Type<string>;
    level: import("@kbn/config-schema").Type<"trace" | "error" | "all" | "fatal" | "warn" | "info" | "debug" | "off">;
}>;
export declare const config: {
    path: string;
    schema: import("@kbn/config-schema").ObjectType<{
        appenders: import("@kbn/config-schema").Type<Map<string, AppenderConfigType>>;
        loggers: import("@kbn/config-schema").Type<Readonly<{} & {
            name: string;
            level: "trace" | "error" | "all" | "fatal" | "warn" | "info" | "debug" | "off";
            appenders: string[];
        }>[]>;
        root: import("@kbn/config-schema").ObjectType<{
            appenders: import("@kbn/config-schema").Type<string[]>;
            level: import("@kbn/config-schema").Type<"trace" | "error" | "all" | "fatal" | "warn" | "info" | "debug" | "off">;
        }>;
        browser: import("@kbn/config-schema").ObjectType<{
            root: import("@kbn/config-schema").ObjectType<{
                level: import("@kbn/config-schema").Type<"trace" | "error" | "all" | "fatal" | "warn" | "info" | "debug" | "off">;
            }>;
            loggers: import("@kbn/config-schema").Type<Readonly<{} & {
                name: string;
                level: "trace" | "error" | "all" | "fatal" | "warn" | "info" | "debug" | "off";
            }>[]>;
        }>;
    }>;
};
/** @internal */
export type LoggingConfigType = Pick<TypeOf<typeof config.schema>, 'loggers' | 'root'> & {
    appenders: Map<string, AppenderConfigType>;
};
/** @internal */
export type LoggingConfigWithBrowserType = LoggingConfigType & Pick<TypeOf<typeof config.schema>, 'browser'>;
/**
 * Config schema for validating the inputs to the {@link LoggingServiceStart.configure} API.
 * See {@link LoggerContextConfigType}.
 *
 * @public
 */
export declare const loggerContextConfigSchema: import("@kbn/config-schema").ObjectType<{
    appenders: import("@kbn/config-schema").Type<Map<string, AppenderConfigType>>;
    loggers: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        level: "trace" | "error" | "all" | "fatal" | "warn" | "info" | "debug" | "off";
        appenders: string[];
    }>[]>;
}>;
/** @public */
export type LoggerContextConfigType = TypeOf<typeof loggerContextConfigSchema>;
/**
 * Describes the config used to fully setup logging subsystem.
 * @internal
 */
export declare class LoggingConfig {
    private readonly configType;
    /**
     * Helper method that joins separate string context parts into single context string.
     * In case joined context is an empty string, `root` context name is returned.
     * @param contextParts List of the context parts (e.g. ['parent', 'child'].
     * @returns {string} Joined context string (e.g. 'parent.child').
     */
    static getLoggerContext(contextParts: string[]): string;
    /**
     * Helper method that returns parent context for the specified one.
     * @param context Context to find parent for.
     * @returns Name of the parent context or `root` if the context is the top level one.
     */
    static getParentLoggerContext(context: string): string;
    /**
     * Map of the appender unique arbitrary key and its corresponding config.
     */
    readonly appenders: Map<string, AppenderConfigType>;
    /**
     * Map of the logger unique arbitrary key (context) and its corresponding config.
     */
    readonly loggers: Map<string, LoggerConfigType>;
    constructor(configType: LoggingConfigType);
    /**
     * Returns a new LoggingConfig that merges the existing config with the specified config.
     *
     * @remarks
     * Does not support merging the `root` config property.
     *
     * @param contextConfig
     */
    extend(contextConfig: LoggerContextConfigType): LoggingConfig;
    private fillAppendersConfig;
    private fillLoggersConfig;
}
