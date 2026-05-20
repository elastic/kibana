import { type DataView, type DataViewField } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
export declare enum DiscoverSidebarReducerActionType {
    RESET = "RESET",
    DATA_VIEW_SWITCHED = "DATA_VIEW_SWITCHED",
    DOCUMENTS_LOADED = "DOCUMENTS_LOADED",
    DOCUMENTS_LOADING = "DOCUMENTS_LOADING"
}
type DiscoverSidebarReducerAction = {
    type: DiscoverSidebarReducerActionType.RESET;
    payload: {
        dataView: DataView | null | undefined;
    };
} | {
    type: DiscoverSidebarReducerActionType.DATA_VIEW_SWITCHED;
    payload: {
        dataView: DataView | null | undefined;
    };
} | {
    type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADING;
    payload: {
        isEsqlMode: boolean;
    };
} | {
    type: DiscoverSidebarReducerActionType.DOCUMENTS_LOADED;
    payload: {
        fieldCounts: DiscoverSidebarReducerState['fieldCounts'];
        esqlQueryColumns?: DatatableColumn[];
        isEsqlMode: boolean;
        dataView: DataView | null | undefined;
    };
};
export declare enum DiscoverSidebarReducerStatus {
    INITIAL = "INITIAL",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED"
}
export interface DiscoverSidebarReducerState {
    dataView: DataView | null | undefined;
    allFields: DataViewField[] | null;
    fieldCounts: Record<string, number> | null;
    status: DiscoverSidebarReducerStatus;
}
export declare function getInitialState(dataView?: DataView | null): DiscoverSidebarReducerState;
export declare function discoverSidebarReducer(state: DiscoverSidebarReducerState, action: DiscoverSidebarReducerAction): DiscoverSidebarReducerState;
export {};
