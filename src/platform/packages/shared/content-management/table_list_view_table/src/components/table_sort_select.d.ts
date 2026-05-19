import React from 'react';
import type { Direction } from '@elastic/eui';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { State } from '../table_list_view_table';
export type SortColumnField = 'updatedAt' | 'attributes.title' | 'accessedAt' | string;
export interface CustomSortingOptions {
    field: string;
    sortingLabels: TableColumnSortSelectOption[];
}
interface TableColumnSortSelectOption {
    label: string;
    direction: 'asc' | 'desc';
}
interface Props {
    hasUpdatedAtMetadata: boolean;
    hasRecentlyAccessedMetadata: boolean;
    tableSort: State['tableSort'];
    customSortingOptions?: CustomSortingOptions;
    onChange?: (column: SortColumnField, direction: Direction) => void;
}
export declare function TableSortSelect({ tableSort, customSortingOptions, hasUpdatedAtMetadata, hasRecentlyAccessedMetadata, onChange, }: Props): React.JSX.Element;
export declare function getInitialSorting(tableId: string): {
    isDefault: boolean;
    tableSort: {
        field: SortColumnField;
        direction: Direction;
    };
};
export declare function saveSorting(tableId: string, tableSort: {
    field: SortColumnField;
    direction: Direction;
}): void;
/**
 * Default custom sorting for the table when recently accessed info is available
 * Sorts by recently accessed list first and the by lastUpdatedAt
 */
export declare function sortByRecentlyAccessed<T extends UserContentCommonSchema>(items: T[], recentlyAccessed: Array<{
    id: string;
}>): T[];
export {};
