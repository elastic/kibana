import type { Filter, DataViewBase } from '@kbn/es-query';
export declare function getIndexPatternFromFilter<T extends DataViewBase = DataViewBase>(filter: Filter, indexPatterns: T[]): T | undefined;
