import React from 'react';
import type { EuiBasicTableColumn, Pagination, Direction } from '@elastic/eui';
import { Query } from '@elastic/eui';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { RecentlyAccessed } from '@kbn/recently-accessed';
import type { SavedObjectsFindOptionsReference } from './services';
import { type SortColumnField } from './components';
import type { RowActions, SearchQueryError } from './types';
import type { CustomSortingOptions } from './components/table_sort_select';
interface ContentEditorConfig extends Pick<OpenContentEditorParams, 'isReadonly' | 'onSave' | 'customValidators'> {
    enabled?: boolean;
}
export interface TableListViewTableProps<T extends UserContentCommonSchema = UserContentCommonSchema> {
    entityName: string;
    entityNamePlural: string;
    initialFilter?: string;
    initialPageSize: number;
    emptyPrompt?: JSX.Element;
    /** Add an additional custom column */
    customTableColumn?: EuiBasicTableColumn<T>;
    customSortingOptions?: CustomSortingOptions;
    urlStateEnabled?: boolean;
    createdByEnabled?: boolean;
    /**
     * Id of the heading element describing the table. This id will be used as `aria-labelledby` of the wrapper element.
     * If the table is not empty, this component renders its own h1 element using the same id.
     */
    headingId?: string;
    /** An optional id for the listing. Used to generate unique data-test-subj. Default: "userContent" */
    id?: string;
    /**
     * Configuration of the table row item actions. Disable specific action for a table row item.
     * Currently only the "delete" ite action can be disabled.
     */
    rowItemActions?: (obj: T) => RowActions | undefined;
    findItems(searchQuery: string, refs?: {
        references?: SavedObjectsFindOptionsReference[];
        referencesToExclude?: SavedObjectsFindOptionsReference[];
        tabId?: string;
    }): Promise<{
        total: number;
        hits: T[];
    }>;
    /** Handler to set the item title "href" value. If it returns undefined there won't be a link for this item. */
    getDetailViewLink?: (entity: T) => string | undefined;
    /** Handler to execute when clicking the item title */
    getOnClickTitle?: (item: T) => (() => void) | undefined;
    createItem?(): void;
    deleteItems?(items: T[]): Promise<void>;
    /**
     * Edit action onClick handler. Edit action not provided when property is not provided
     */
    editItem?(item: T): void;
    /**
     * Name for the column containing the "title" value.
     */
    titleColumnName?: string;
    /**
     * This assumes the content is already wrapped in an outer PageTemplate component.
     * @note Hack! This is being used as a workaround so that this page can be rendered in the Kibana management UI
     * @deprecated
     */
    withoutPageTemplateWrapper?: boolean;
    contentEditor?: ContentEditorConfig;
    recentlyAccessed?: Pick<RecentlyAccessed, 'get'>;
    tableCaption: string;
    /** Flag to force a new fetch of the table items. Whenever it changes, the `findItems()` will be called. */
    refreshListBouncer?: boolean;
    onFetchSuccess: () => void;
    setPageDataTestSubject: (subject: string) => void;
}
export interface State<T extends UserContentCommonSchema = UserContentCommonSchema> {
    items: T[];
    /**
     * Flag to indicate if there aren't any item when **no filteres are applied**.
     * When there are no item we render an empty prompt.
     * Default to `undefined` to indicate that we don't know yet if there are items or not.
     */
    hasNoItems: boolean | undefined;
    hasInitialFetchReturned: boolean;
    isFetchingItems: boolean;
    isDeletingItems: boolean;
    showDeleteModal: boolean;
    fetchError?: IHttpFetchError<Error>;
    searchQuery: {
        text: string;
        query: Query;
        error: SearchQueryError | null;
    };
    selectedIds: string[];
    totalItems: number;
    hasUpdatedAtMetadata: boolean;
    hasCreatedByMetadata: boolean;
    hasRecentlyAccessedMetadata: boolean;
    pagination: Pagination;
    tableSort: {
        field: SortColumnField;
        direction: Direction;
    };
    sortColumnChanged: boolean;
    tableFilter: {
        createdBy: string[];
        favorites: boolean;
    };
}
export interface URLState {
    s?: string;
    sort?: {
        field: SortColumnField;
        direction: Direction;
    };
    filter?: {
        createdBy?: string[];
        favorites?: boolean;
    };
    [key: string]: unknown;
}
declare function TableListViewTableComp<T extends UserContentCommonSchema>({ tableCaption, entityName, entityNamePlural, initialFilter: initialQuery, headingId, initialPageSize, urlStateEnabled, customSortingOptions, customTableColumn, emptyPrompt, rowItemActions, findItems, createItem, editItem, deleteItems, getDetailViewLink, getOnClickTitle, id: listingId, contentEditor, titleColumnName, withoutPageTemplateWrapper, onFetchSuccess, refreshListBouncer, setPageDataTestSubject, createdByEnabled, recentlyAccessed, }: TableListViewTableProps<T>): React.JSX.Element;
export declare const TableListViewTable: typeof TableListViewTableComp;
export {};
