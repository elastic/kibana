import type { AggParamsFilters } from '@kbn/data-plugin/common';
import type { FiltersColumn } from './types';
export declare const convertToFiltersColumn: (aggId: string, aggParams: AggParamsFilters, isSplit?: boolean) => FiltersColumn | null;
