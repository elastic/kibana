import type { Filter } from '@kbn/es-query';
import type { Logger } from '@kbn/core/server';
interface OverrideTimeRangeOpts {
    currentFilters: Filter[] | Filter | undefined;
    forceNow: string;
    logger: Logger;
    timeFieldName?: string;
}
export declare const overrideTimeRange: ({ currentFilters, forceNow, logger, timeFieldName, }: OverrideTimeRangeOpts) => Filter[] | undefined;
export {};
