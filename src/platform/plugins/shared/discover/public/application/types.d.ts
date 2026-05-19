import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
export declare enum FetchStatus {
    UNINITIALIZED = "uninitialized",
    LOADING = "loading",
    LOADING_MORE = "loading_more",
    PARTIAL = "partial",
    COMPLETE = "complete",
    ERROR = "error"
}
export interface RecordsFetchResponse {
    records: DataTableRecord[];
    esqlQueryColumns?: DatatableColumn[];
    esqlHeaderWarning?: string;
    interceptedWarnings?: SearchResponseWarning[];
}
export interface SidebarToggleState {
    isCollapsed: boolean;
    toggle: undefined | ((isCollapsed: boolean) => void);
}
