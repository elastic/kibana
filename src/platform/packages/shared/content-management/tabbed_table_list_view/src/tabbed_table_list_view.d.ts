import React from 'react';
import type { TableListViewTableProps } from '@kbn/content-management-table-list-view-table';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { TableListViewProps } from '@kbn/content-management-table-list-view';
export interface TableListBreadcrumb {
    text: string;
    href: string;
}
export type TableListTabParentProps<T extends UserContentCommonSchema = UserContentCommonSchema> = Pick<TableListViewTableProps<T>, 'onFetchSuccess' | 'setPageDataTestSubject'> & {
    getBreadcrumbs?: (appId: string) => TableListBreadcrumb[];
};
export interface TableListTab<T extends UserContentCommonSchema = UserContentCommonSchema> {
    title: string;
    id: string;
    getTableList: (propsFromParent: TableListTabParentProps<T>) => Promise<React.ReactNode> | React.ReactNode;
}
type TabbedTableListViewProps = Pick<TableListViewProps<UserContentCommonSchema>, 'title' | 'description' | 'headingId' | 'children'> & {
    tabs: TableListTab[];
    activeTabId: string;
    changeActiveTab: (id: string) => void;
    getBreadcrumbs?: TableListTabParentProps['getBreadcrumbs'];
};
export declare const TabbedTableListView: ({ title, description, headingId, children, tabs, activeTabId, changeActiveTab, getBreadcrumbs, }: TabbedTableListViewProps) => React.JSX.Element;
export {};
