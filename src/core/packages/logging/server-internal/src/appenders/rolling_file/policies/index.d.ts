import moment from 'moment-timezone';
import type { TriggeringPolicyConfig } from '@kbn/core-logging-server';
import type { TriggeringPolicy } from './policy';
import type { RollingFileContext } from '../rolling_file_context';
export type { TriggeringPolicy } from './policy';
export declare const triggeringPolicyConfigSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    size: import("@kbn/config-schema").ByteSizeValue;
    type: "size-limit";
}> | Readonly<{} & {
    type: "time-interval";
    interval: moment.Duration;
    modulate: boolean;
}>>;
export declare const createTriggeringPolicy: (config: TriggeringPolicyConfig, context: RollingFileContext) => TriggeringPolicy;
