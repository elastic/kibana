import type { LogLevelId, MetaFilterConfig } from '@kbn/logging';
export type { MetaFilterConfig };
/**
 * Describes the configuration of a given logger.
 *
 * @public
 */
export interface LoggerConfigType {
    appenders: string[];
    name: string;
    level: LogLevelId;
    /**
     * Meta-based filters to apply on top of the nominal log level.
     * Omit or set to `[]` to inherit from the nearest ancestor with filters configured.
     * Set to `null` to opt out of inherited filters.
     */
    filters?: MetaFilterConfig[] | null;
}
