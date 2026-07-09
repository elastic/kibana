/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
} from '@kbn/content-list';
import { KibanaContentListPage } from '@kbn/content-list-page';
import { dashboardLabels, useDashboardExampleProviderProps } from './example_services';

export const StandardKibanaPageExample = () => {
  const providerProps = useDashboardExampleProviderProps();

  return (
    <ContentListProvider id="docs-standard-page" labels={dashboardLabels} {...providerProps}>
      <KibanaContentListPage>
        <KibanaContentListPage.Header
          title="Dashboards"
          actions={
            <EuiButton fill iconType="plusInCircle">
              Create dashboard
            </EuiButton>
          }
        />
        <KibanaContentListPage.Section>
          <ContentList>
            <ContentListToolbar />
            <ContentListTable title="Dashboards" />
            <ContentListFooter />
          </ContentList>
        </KibanaContentListPage.Section>
      </KibanaContentListPage>
    </ContentListProvider>
  );
};
