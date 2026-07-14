import type { Filter, FilterMeta } from '..';
export declare const updateFilter: (filter: Filter, field?: string, operator?: FilterMeta, params?: Filter["meta"]["params"], fieldType?: string) => Filter;
