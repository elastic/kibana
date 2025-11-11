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

export type ContentType = 'dashboards' | 'visualizations' | 'annotation-groups';
interface TabbedTableFilterProps {
  onSelectedTabChanged: (tabId: ContentType) => void;
  selectedTabId: ContentType;
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
          onClick={() => props.onSelectedTabChanged('dashboards')}
          isSelected={props.selectedTabId === 'dashboards'}
          data-test-subj="dashboardsTab"
        >
          <FormattedMessage
            id="contentManagement.tableList.tabsFilter.dashboardsTabLabel"
            defaultMessage="Dashboards"
          />
        </EuiTab>
        <EuiTab
          onClick={() => props.onSelectedTabChanged('visualizations')}
          isSelected={props.selectedTabId === 'visualizations'}
          data-test-subj="visualizationsTab"
        >
          <FormattedMessage
            id="contentManagement.tableList.tabsFilter.visualizationsTabLabel"
            defaultMessage="Visualizations"
          />
        </EuiTab>
        <EuiTab
          onClick={() => props.onSelectedTabChanged('annotation-groups')}
          isSelected={props.selectedTabId === 'annotation-groups'}
          data-test-subj="annotationGroupsTab"
        >
          <FormattedMessage
            id="contentManagement.tableList.tabsFilter.annotationGroupsTabLabel"
            defaultMessage="Annotation groups"
          />
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size={'s'} />
    </>
  );
};
