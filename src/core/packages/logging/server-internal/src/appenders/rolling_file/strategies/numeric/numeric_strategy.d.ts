import type { NumericRollingStrategyConfig } from '@kbn/core-logging-server';
import type { RollingStrategy } from '../strategy';
import type { RollingFileContext } from '../../rolling_file_context';
export declare const numericRollingStrategyConfigSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"numeric">;
    pattern: import("@kbn/config-schema").Type<string>;
    max: import("@kbn/config-schema").Type<number>;
}>;
/**
 * A rolling strategy that will suffix the file with a given pattern when rolling,
 * and will only retain a fixed amount of rolled files.
 *
 * @example
 * ```yaml
 * logging:
 *   appenders:
 *     rolling-file:
 *       type: rolling-file
 *       fileName: /kibana.log
 *       strategy:
 *         type: numeric
 *         pattern: "-%i"
 *       retention:
 *         maxFiles: 2
 * ```
 * - During the first rollover kibana.log is renamed to kibana-1.log. A new kibana.log file is created and starts
 *   being written to.
 * - During the second rollover kibana-1.log is renamed to kibana-2.log and kibana.log is renamed to kibana-1.log.
 *   A new kibana.log file is created and starts being written to.
 * - During the third and subsequent rollovers, kibana-2.log is deleted, kibana-1.log is renamed to kibana-2.log and
 *   kibana.log is renamed to kibana-1.log. A new kibana.log file is created and starts being written to.
 *
 * See {@link NumericRollingStrategyConfig} for more details.
 */
export declare class NumericRollingStrategy implements RollingStrategy {
    private readonly config;
    private readonly context;
    private readonly logFilePath;
    private readonly logFileBaseName;
    private readonly logFileFolder;
    constructor(config: NumericRollingStrategyConfig, context: RollingFileContext);
    private getOrderedRolledFiles;
    rollout(): Promise<void>;
}
