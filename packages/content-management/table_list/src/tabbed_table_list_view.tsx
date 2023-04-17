/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiTab, EuiTabs } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useEffect, useState } from 'react';
import type {
  TableListProps,
  TableListViewProps,
  UserContentCommonSchema,
} from './table_list_view';

export type TableListTabParentProps<T extends UserContentCommonSchema = UserContentCommonSchema> =
  Pick<TableListProps<T>, 'onFetchSuccess'>;

export interface TableListTab<T extends UserContentCommonSchema = UserContentCommonSchema> {
  title: string;
  getTableList: (
    propsFromParent: TableListTabParentProps<T>
  ) => Promise<React.ReactNode> | React.ReactNode;
}

type TabbedTableListViewProps = Pick<
  TableListViewProps<UserContentCommonSchema>,
  'title' | 'description' | 'headingId' | 'children'
> & { tabs: TableListTab[] };

export const TabbedTableListView = ({
  title,
  description,
  headingId,
  children,
  tabs,
}: TabbedTableListViewProps) => {
  const [hasInitialFetchReturned, setHasInitialFetchReturned] = useState(false);

  const [selectedTab, setSelectedTab] = useState(0);

  const [tableList, setTableList] = useState<React.ReactNode>(null);

  useEffect(() => {
    async function loadTableList() {
      const newTableList = await tabs[selectedTab].getTableList({
        onFetchSuccess: () => {
          if (!hasInitialFetchReturned) {
            setHasInitialFetchReturned(true);
          }
        },
      });
      setTableList(newTableList);
    }

    loadTableList();
  }, [hasInitialFetchReturned, selectedTab, tabs]);

  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header
        pageTitle={<span id={headingId}>{title}</span>}
        description={description}
        data-test-subj="top-nav"
      >
        <EuiTabs>
          {tabs.map((tab, index) => (
            <EuiTab
              key={index}
              onClick={() => setSelectedTab(index)}
              isSelected={index === selectedTab}
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
