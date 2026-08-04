import React from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { FieldListItem } from '@kbn/unified-field-list';
import { type FieldTypeFilterProps } from '@kbn/unified-field-list/src/components/field_list_filters/field_type_filter';
import type { FieldRow } from './field_row';
export declare const LOCAL_STORAGE_KEY_SEARCH_TERM = "discover:searchText";
export declare const LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES = "unifiedDocViewer:selectedFieldTypes";
export declare enum TermMatch {
    name = "name",
    value = "value",
    both = "both"
}
interface TableFiltersCommonProps {
    searchTerm: string;
    onChangeSearchTerm: (searchTerm: string) => void;
    selectedFieldTypes: FieldTypeFilterProps<FieldListItem>['selectedFieldTypes'];
    onChangeFieldTypes: FieldTypeFilterProps<FieldListItem>['onChange'];
}
export interface TableFiltersProps extends TableFiltersCommonProps {
    allFields: FieldListItem[];
}
export declare const TableFilters: React.FC<TableFiltersProps>;
export declare const useTableFiltersState: ({ storage, storageKey, }: {
    storage: Storage;
    storageKey: string;
}) => TableFiltersCommonProps;
export interface UseTableFiltersCallbacksReturn {
    onFilterField: (row: FieldRow) => boolean;
    onFindSearchTermMatch: (row: FieldRow, term: string) => TermMatch | null;
}
export declare const useTableFiltersCallbacks: ({ searchTerm, selectedFieldTypes, }: Pick<ReturnType<typeof useTableFiltersState>, "searchTerm" | "selectedFieldTypes">) => {
    onFilterField: (row: FieldRow) => boolean;
    onFindSearchTermMatch: (row: FieldRow, term: string) => TermMatch | null;
};
export {};
