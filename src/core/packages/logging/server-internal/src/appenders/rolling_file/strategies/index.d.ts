import type { NumericRollingStrategyConfig } from '@kbn/core-logging-server';
import type { RollingStrategy } from './strategy';
import type { RollingFileContext } from '../rolling_file_context';
export type { RollingStrategy } from './strategy';
export type RollingStrategyConfig = NumericRollingStrategyConfig;
export declare const rollingStrategyConfigSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: "numeric";
    pattern: string;
    max: number;
}>>;
export declare const createRollingStrategy: (config: RollingStrategyConfig, context: RollingFileContext) => RollingStrategy;
