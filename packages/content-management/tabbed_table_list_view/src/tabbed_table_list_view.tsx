/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiTab, EuiTabs } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect, useState } from 'react';
import type {
  TableListViewTableProps,
  UserContentCommonSchema,
} from '@kbn/content-management-table-list-view-table';
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
> & { tabs: TableListTab[]; activeTabId: string; changeActiveTab: (id: string) => void };

export const TabbedTableListView = ({
  title,
  description,
  headingId,
  children,
  tabs,
  activeTabId,
  changeActiveTab,
}: TabbedTableListViewProps) => {
  const [hasInitialFetchReturned, setHasInitialFetchReturned] = useState(false);
  const [pageDataTestSubject, setPageDataTestSubject] = useState<string>();

  const getActiveTab = useCallback(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [activeTabId, tabs]
  );

  const [tableList, setTableList] = useState<React.ReactNode>(null);

  useEffect(() => {
    async function loadTableList() {
      const newTableList = await getActiveTab().getTableList({
        onFetchSuccess: () => {
          if (!hasInitialFetchReturned) {
            setHasInitialFetchReturned(true);
          }
        },
        setPageDataTestSubject,
      });
      setTableList(newTableList);
    }

    loadTableList();
  }, [hasInitialFetchReturned, activeTabId, tabs, getActiveTab]);

  return (
    <KibanaPageTemplate panelled data-test-subj={pageDataTestSubject}>
      <KibanaPageTemplate.Header
        pageTitle={<span id={headingId}>{title}</span>}
        description={description}
        data-test-subj="top-nav"
        css={css`
          .euiPageHeaderContent {
            padding-bottom: 0;
          }
        `}
      >
        <EuiTabs>
          {tabs.map((tab, index) => (
            <EuiTab
              key={index}
              onClick={() => changeActiveTab(tab.id)}
              isSelected={tab.id === getActiveTab().id}
            >
              {tab.title}
            </EuiTab>
          ))}
        </EuiTabs>
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section aria-labelledby={hasInitialFetchReturned ? headingId : undefined}>
        {/* Any children passed to the component */}
        {children}

        {tableList}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
