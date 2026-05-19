import type { RetentionPolicyConfig, RollingStrategyConfig } from '@kbn/core-logging-server';
import type { RollingFileContext } from '../rolling_file_context';
import { type RetentionPolicy } from './retention_policy';
export declare const createRetentionPolicy: (config: RetentionPolicyConfig, context: RollingFileContext) => RetentionPolicy;
export declare const mergeRetentionPolicyConfig: (config: RetentionPolicyConfig | undefined, strategyConfig: RollingStrategyConfig) => RetentionPolicyConfig;
