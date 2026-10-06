import type { LogLevelId } from '@kbn/logging';
/**
 * Describes the configuration of a given logger.
 *
 * @public
 */
export interface LoggerConfigType {
    appenders: string[];
    name: string;
    level: LogLevelId;
}
