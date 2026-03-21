import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { DocViewFilterFn } from '../types';
interface Params {
    dataViewField: DataViewField | undefined;
    hideFilteringOnComputedColumns: boolean | undefined;
    onFilter: DocViewFilterFn | undefined;
}
export declare function shouldShowFieldFilterInOutActions({ dataViewField, hideFilteringOnComputedColumns, onFilter, }: Params): boolean;
export declare function shouldShowFieldFilterExistAction(params: Params): boolean;
export {};
