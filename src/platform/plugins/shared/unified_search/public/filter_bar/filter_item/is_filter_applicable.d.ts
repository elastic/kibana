import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
export declare const getFilterKeys: (filter: Filter) => string[];
/**
 * Checks if filter field exists in any of the index patterns provided,
 * Because if so, a filter for the wrong index pattern may still be applied.
 */
export declare const isFilterApplicable: (filter: Filter, dataViews: DataView[]) => boolean;
