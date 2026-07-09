/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
  type ContentListItem,
} from '@kbn/content-list';
import { dashboardLabels, useDashboardExampleProviderProps } from './example_services';

const { Column } = ContentListTable;

export const CustomColumnExample = () => {
  const providerProps = useDashboardExampleProviderProps();

  return (
    <ContentListProvider id="docs-custom-column" labels={dashboardLabels} {...providerProps}>
      <ContentList>
        <ContentListToolbar />
        <ContentListTable title="Dashboards">
          <Column.Name showDescription />
          <Column
            id="type"
            name="Type"
            width="8em"
            render={(item: ContentListItem) => <EuiBadge>{item.type}</EuiBadge>}
          />
          <Column.UpdatedAt />
        </ContentListTable>
        <ContentListFooter />
      </ContentList>
    </ContentListProvider>
  );
};
