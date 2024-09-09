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
import { FormattedMessage } from '@kbn/i18n-react';

interface TabbedTableFilterProps {
  onSelectedTabChanged: (tabId: 'all' | 'favorite') => void;
  selectedTabId: 'all' | 'favorite';
}

export const TabbedTableFilter = (props: TabbedTableFilterProps) => {
  return (
    <>
      <EuiTabs
        data-test-subj="tabbedTableFilter"
        style={{
          marginTop:
            '-8px' /* TODO: the default EuiTable betweenChildren spacing is too big, needs eui change */,
        }}
      >
        <EuiTab
          onClick={() => props.onSelectedTabChanged('all')}
          isSelected={props.selectedTabId === 'all'}
          data-test-subj="allTab"
        >
          <FormattedMessage
            id="contentManagement.tableList.tabsFilter.allTabLabel"
            defaultMessage="All"
          />
        </EuiTab>
        <EuiTab
          onClick={() => props.onSelectedTabChanged('favorite')}
          isSelected={props.selectedTabId === 'favorite'}
          data-test-subj="favoriteTab"
        >
          <FormattedMessage
            id="contentManagement.tableList.tabsFilter.favoriteTabLabel"
            defaultMessage="Starred"
          />
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size={'s'} />
    </>
  );
};
