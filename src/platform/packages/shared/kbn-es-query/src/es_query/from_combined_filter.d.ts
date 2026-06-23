import type { Filter } from '../filters';
import type { DataViewBase } from './types';
import type { EsQueryFiltersConfig } from './from_filters';
export declare const fromCombinedFilter: (filter: Filter, dataViews?: DataViewBase | DataViewBase[], options?: EsQueryFiltersConfig) => Filter;
