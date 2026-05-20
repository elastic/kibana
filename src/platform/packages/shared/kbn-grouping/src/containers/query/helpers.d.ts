import type { Filter } from '@kbn/es-query';
export declare const getEmptyValue: () => string;
export declare const checkIsFlattenResults: (groupByField: string, fields?: string[]) => boolean;
type StrictFilter = Filter & {
    query: Record<string, any>;
};
export declare const createGroupFilter: (selectedGroup: string, values?: string[] | null, multiValueFields?: string[]) => StrictFilter[];
export declare const getNullGroupFilter: (selectedGroup: string) => StrictFilter[];
export {};
