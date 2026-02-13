/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect, useState } from 'react';
import type { TableListViewTableProps } from '@kbn/content-management-table-list-view-table';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { TableListViewProps } from '@kbn/content-management-table-list-view';

export type TableListTabParentProps<T extends UserContentCommonSchema = UserContentCommonSchema> =
  Pick<TableListViewTableProps<T>, 'onFetchSuccess' | 'setPageDataTestSubject'>;

export interface TableListTab<T extends UserContentCommonSchema = UserContentCommonSchema> {
  title: string;
  id: string;
  getTableList: (
    propsFromParent: TableListTabParentProps<T>
  ) => Promise<React.ReactNode> | React.ReactNode;
}

type TabbedTableListViewProps = Pick<
  TableListViewProps<UserContentCommonSchema>,
  'title' | 'description' | 'headingId' | 'children'
> & {
  tabs: TableListTab[];
  activeTabId: string;
  changeActiveTab: (id: string) => void;
  /** When true, hides the page title and description but keeps the tabs visible */
  hidePageTitle?: boolean;
  /** When false, content uses full width. Passed to KibanaPageTemplate (EUI defaults to true). */
  restrictWidth?: boolean | number | string;
};

export const TabbedTableListView = ({
  title,
  description,
  headingId,
  children,
  tabs,
  activeTabId,
  changeActiveTab,
  hidePageTitle = false,
  restrictWidth,
}: TabbedTableListViewProps) => {
  const [hasInitialFetchReturned, setHasInitialFetchReturned] = useState(false);
  const [pageDataTestSubject, setPageDataTestSubject] = useState<string>();

  const getActiveTab = useCallback(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [activeTabId, tabs]
  );

  const onFetchSuccess = useCallback(() => {
    setHasInitialFetchReturned(true);
  }, []);

  const [tableList, setTableList] = useState<React.ReactNode>(null);

  useEffect(() => {
    async function loadTableList() {
      const newTableList = await getActiveTab().getTableList({
        onFetchSuccess,
        setPageDataTestSubject,
      });
      setTableList(newTableList);
    }

    loadTableList();
  }, [activeTabId, tabs, getActiveTab, onFetchSuccess]);

  const headerPageTitle = hidePageTitle ? undefined : <span id={headingId}>{title}</span>;
  const headerDescription = hidePageTitle ? undefined : description;

  return (
    <KibanaPageTemplate
      panelled
      data-test-subj={pageDataTestSubject}
      {...(restrictWidth !== undefined && { restrictWidth })}
    >
      {hidePageTitle && (
        <span id={headingId} className="euiScreenReaderOnly">
          {title}
        </span>
      )}
      <KibanaPageTemplate.Header
        pageTitle={headerPageTitle}
        description={headerDescription}
        data-test-subj="top-nav"
        tabs={tabs.map((tab) => ({
          onClick: () => changeActiveTab(tab.id),
          isSelected: tab.id === getActiveTab().id,
          label: tab.title,
        }))}
      />
      <KibanaPageTemplate.Section aria-labelledby={hasInitialFetchReturned ? headingId : undefined}>
        {/* Any children passed to the component */}
        {children}

        {tableList}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
