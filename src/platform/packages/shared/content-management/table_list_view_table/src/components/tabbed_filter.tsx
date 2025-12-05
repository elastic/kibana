/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTab, EuiTabs, EuiSpacer } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';

export interface TabConfig {
  id: string;
  name: string | React.ReactNode;
}

export interface TabEntityNameConfig<T extends object> {
  /** Display name for the tab (e.g., "Dashboards") */
  tabName: string;
  /** Entity name singular for use in sentences (e.g., "dashboard") */
  entityName: string;
  /** Entity name plural for use in sentences (e.g., "dashboards") */
  entityNamePlural: string;
  /** Custom empty prompt body for this tab */
  emptyPromptBody?: React.ReactNode;
  /**
   * Column configuration for this tab.
   */
  columns?: {
    /** Whether to show the Creator column. Default: true */
    showCreatorColumn?: boolean;
    /** Optional custom table column specific to this tab (e.g., Type or Data view column) */
    customTableColumn?: EuiBasicTableColumn<T>;
  };
}

interface TabbedTableFilterProps {
  tabs: TabConfig[];
  onSelectedTabChanged: (tabId: string) => void;
  selectedTabId: string;
}

export const TabbedTableFilter = (props: TabbedTableFilterProps) => {
  const { tabs, onSelectedTabChanged, selectedTabId } = props;

  return (
    <>
      <EuiTabs
        size="l"
        data-test-subj="tabbedTableFilter"
        style={{
          marginTop:
            '-8px' /* TODO: the default EuiTable betweenChildren spacing is too big, needs eui change */,
        }}
      >
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            onClick={() => onSelectedTabChanged(tab.id)}
            isSelected={selectedTabId === tab.id}
            data-test-subj={`${tab.id}Tab`}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size={'s'} />
    </>
  );
};
