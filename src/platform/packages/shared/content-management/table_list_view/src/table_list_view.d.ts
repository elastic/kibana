import type { ReactNode } from 'react';
import React from 'react';
import { type TableListViewTableProps } from '@kbn/content-management-table-list-view-table';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
export type TableListViewProps<T extends UserContentCommonSchema = UserContentCommonSchema> = Pick<TableListViewTableProps<T>, 'entityName' | 'entityNamePlural' | 'initialFilter' | 'headingId' | 'initialPageSize' | 'urlStateEnabled' | 'customTableColumn' | 'emptyPrompt' | 'findItems' | 'createItem' | 'editItem' | 'deleteItems' | 'getDetailViewLink' | 'getOnClickTitle' | 'id' | 'rowItemActions' | 'contentEditor' | 'titleColumnName' | 'withoutPageTemplateWrapper' | 'createdByEnabled' | 'recentlyAccessed'> & {
    title: string;
    description?: string;
    /**
     * Additional actions (buttons) to be placed in the page header.
     * @note only the first two values will be used.
     */
    additionalRightSideActions?: ReactNode[];
    children?: ReactNode | undefined;
};
export declare const TableListView: <T extends UserContentCommonSchema>({ title, description, entityName, entityNamePlural, initialFilter, headingId, initialPageSize, urlStateEnabled, customTableColumn, emptyPrompt, findItems, createItem, editItem, deleteItems, getDetailViewLink, getOnClickTitle, rowItemActions, id: listingId, contentEditor, children, titleColumnName, additionalRightSideActions, withoutPageTemplateWrapper, createdByEnabled, recentlyAccessed, }: TableListViewProps<T>) => React.JSX.Element;
export default TableListView;
