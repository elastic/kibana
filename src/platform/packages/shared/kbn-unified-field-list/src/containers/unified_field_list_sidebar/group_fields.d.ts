import { type DataViewField, type DataView } from '@kbn/data-views-plugin/public';
import type { SearchMode } from '../../types';
export declare function shouldShowField(field: DataViewField | undefined, searchMode: SearchMode | undefined, disableMultiFieldsGroupingByParent: boolean | undefined): boolean;
export declare const INITIAL_SELECTED_FIELDS_RESULT: {
    selectedFields: never[];
    selectedFieldsMap: {};
};
export interface SelectedFieldsResult {
    selectedFields: DataViewField[];
    selectedFieldsMap: Record<string, boolean>;
}
export declare function getSelectedFields({ dataView, workspaceSelectedFieldNames, allFields, searchMode, }: {
    dataView: DataView | undefined;
    workspaceSelectedFieldNames?: string[];
    allFields: DataViewField[] | null;
    searchMode: SearchMode | undefined;
}): SelectedFieldsResult;
