import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';
export interface DataViewByIdOrTitle {
    type: 'title' | 'id';
    value: string;
}
export declare function fetchIndexPatterns(indexPatternsService: DataViewsContract, indexPatternStrings: DataViewByIdOrTitle[]): Promise<DataView[]>;
