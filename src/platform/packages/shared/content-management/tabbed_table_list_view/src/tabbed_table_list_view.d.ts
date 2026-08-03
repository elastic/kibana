import type { EuiPageHeaderProps } from '@elastic/eui';
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
    showCreateButton?: boolean;
};
export interface TableListTab<T extends UserContentCommonSchema = UserContentCommonSchema> {
    title: string;
    id: string;
    getTableList: (propsFromParent: TableListTabParentProps<T>) => Promise<React.ReactNode> | React.ReactNode;
}
type TabbedTableListViewProps = Pick<TableListViewProps<UserContentCommonSchema>, 'description' | 'headingId' | 'children'> & {
    title?: TableListViewProps<UserContentCommonSchema>['title'];
    tabs: TableListTab[];
    activeTabId: string;
    changeActiveTab: (id: string) => void;
    getBreadcrumbs?: TableListTabParentProps['getBreadcrumbs'];
    showCreateButton?: boolean;
    hideTabs?: boolean;
    /**
     * Action node(s) rendered on the page title row, forwarded to
     * {@link KibanaPageTemplate.Header}'s `rightSideItems`. The shell renders one
     * shared header across tabs, so callers must gate tab-specific actions on
     * `activeTabId` themselves.
     */
    rightSideItems?: EuiPageHeaderProps['rightSideItems'];
};
export declare const TabbedTableListView: ({ title, description, headingId, children, tabs, activeTabId, changeActiveTab, getBreadcrumbs, showCreateButton, hideTabs, rightSideItems, }: TabbedTableListViewProps) => React.JSX.Element;
export {};
