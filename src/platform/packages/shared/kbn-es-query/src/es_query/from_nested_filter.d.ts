import type { EsQueryFiltersConfig } from '../..';
import type { Filter } from '../filters';
import type { DataViewBase } from './types';
/** @internal */
export declare const fromNestedFilter: (filter: Filter, indexPattern?: DataViewBase, config?: EsQueryFiltersConfig) => Filter;
