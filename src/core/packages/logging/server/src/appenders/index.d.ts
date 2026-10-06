import type { ConsoleAppenderConfig } from './console';
import type { FileAppenderConfig, FileAppenderPluginConfig } from './file';
import type { OtelAppenderConfig, OtelAppenderPluginConfig } from './otel';
import type { RewriteAppenderConfig } from './rewrite';
import type { RollingFileAppenderConfig, RollingFileAppenderPluginConfig } from './rolling_file';
export type { ConsoleAppenderConfig } from './console';
export type { FileAppenderConfig, FileAppenderPluginConfig } from './file';
export type { OtelAppenderConfig, OtelAppenderPluginConfig, OtelAppenderTlsConfig, OtelAttributesTransform, } from './otel';
export type { RewriteAppenderConfig, MetaRewritePolicyConfig, RewritePolicyConfig, MetaRewritePolicyConfigProperty, } from './rewrite';
export type { RollingFileAppenderConfig, RollingFileAppenderPluginConfig, TriggeringPolicyConfig, SizeLimitTriggeringPolicyConfig, TimeIntervalTriggeringPolicyConfig, NumericRollingStrategyConfig, RollingStrategyConfig, RetentionPolicyConfig, } from './rolling_file';
export type { LogFileWriteError, LogFileWriteErrorHandler } from './write_error';
/** @public */
export type AppenderConfigType = ConsoleAppenderConfig | FileAppenderConfig | OtelAppenderConfig | RewriteAppenderConfig | RollingFileAppenderConfig;
/**
 * Appender configs accepted by {@link LoggingServiceSetup.configure}: every YAML-safe
 * {@link AppenderConfigType} plus the plugin-only appender options.
 * @public
 */
export type PluginAppenderConfigType = AppenderConfigType | FileAppenderPluginConfig | OtelAppenderPluginConfig | RollingFileAppenderPluginConfig;
