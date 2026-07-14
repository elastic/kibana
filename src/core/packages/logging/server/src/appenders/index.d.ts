import type { ConsoleAppenderConfig } from './console';
import type { FileAppenderConfig } from './file';
import type { OtelAppenderConfig } from './otel';
import type { RewriteAppenderConfig } from './rewrite';
import type { RollingFileAppenderConfig } from './rolling_file';
export type { ConsoleAppenderConfig } from './console';
export type { FileAppenderConfig } from './file';
export type { OtelAppenderConfig, OtelAppenderTlsConfig } from './otel';
export type { RewriteAppenderConfig, MetaRewritePolicyConfig, RewritePolicyConfig, MetaRewritePolicyConfigProperty, } from './rewrite';
export type { RollingFileAppenderConfig, TriggeringPolicyConfig, SizeLimitTriggeringPolicyConfig, TimeIntervalTriggeringPolicyConfig, NumericRollingStrategyConfig, RollingStrategyConfig, RetentionPolicyConfig, } from './rolling_file';
/** @public */
export type AppenderConfigType = ConsoleAppenderConfig | FileAppenderConfig | OtelAppenderConfig | RewriteAppenderConfig | RollingFileAppenderConfig;
