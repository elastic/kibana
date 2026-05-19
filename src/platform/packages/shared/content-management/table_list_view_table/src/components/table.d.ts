import type { Dispatch } from 'react';
import React from 'react';
import type { EuiBasicTableColumn, CriteriaWithPagination, Direction, Query } from '@elastic/eui';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { Action } from '../actions';
import type { State as TableListViewState, TableListViewTableProps } from '../table_list_view_table';
import type { TableItemsRowActions } from '../types';
import type { Params as UseTagFilterPanelParams } from './use_tag_filter_panel';
import type { CustomSortingOptions, SortColumnField } from './table_sort_select';
type State<T extends UserContentCommonSchema> = Pick<TableListViewState<T>, 'items' | 'selectedIds' | 'searchQuery' | 'tableSort' | 'pagination' | 'tableFilter'>;
type TagManagementProps = Pick<UseTagFilterPanelParams, 'addOrRemoveIncludeTagFilter' | 'addOrRemoveExcludeTagFilter' | 'tagsToTableItemMap'>;
export declare const FORBIDDEN_SEARCH_CHARS = "()[]{}<>+=\\\"$#!\u00BF?,;`'/|&";
interface Props<T extends UserContentCommonSchema> extends State<T>, TagManagementProps {
    dispatch: Dispatch<Action<T>>;
    entityName: string;
    entityNamePlural: string;
    isFetchingItems: boolean;
    tableCaption: string;
    tableColumns: Array<EuiBasicTableColumn<T>>;
    hasUpdatedAtMetadata: boolean;
    hasRecentlyAccessedMetadata: boolean;
    customSortingOptions?: CustomSortingOptions;
    deleteItems: TableListViewTableProps<T>['deleteItems'];
    tableItemsRowActions: TableItemsRowActions;
    renderCreateButton: () => React.ReactElement | undefined;
    onSortChange: (column: SortColumnField, direction: Direction) => void;
    onTableChange: (criteria: CriteriaWithPagination<T>) => void;
    onFilterChange: (filter: Partial<State<T>['tableFilter']>) => void;
    onTableSearchChange: (arg: {
        query: Query | null;
        queryText: string;
    }) => void;
    clearTagSelection: () => void;
    createdByEnabled: boolean;
    favoritesEnabled: boolean;
}
export declare function Table<T extends UserContentCommonSchema>({ dispatch, items, isFetchingItems, searchQuery, selectedIds, pagination, tableColumns, tableSort, tableFilter, hasUpdatedAtMetadata, hasRecentlyAccessedMetadata, customSortingOptions, entityName, entityNamePlural, tagsToTableItemMap, tableItemsRowActions, deleteItems, renderCreateButton, tableCaption, onTableChange, onTableSearchChange, onSortChange, onFilterChange, addOrRemoveExcludeTagFilter, addOrRemoveIncludeTagFilter, clearTagSelection, createdByEnabled, favoritesEnabled, }: Props<T>): React.JSX.Element;
export {};
