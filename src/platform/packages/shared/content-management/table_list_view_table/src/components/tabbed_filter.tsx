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

export interface TabConfig {
  id: string;
  name: string | React.ReactNode;
}

export interface TabEntityNameConfig {
  entityName: string;
  entityNamePlural: string;
  emptyPromptBody?: React.ReactNode;
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
