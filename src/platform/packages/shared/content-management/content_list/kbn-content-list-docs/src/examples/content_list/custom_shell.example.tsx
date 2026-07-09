/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
} from '@kbn/content-list';
import { dashboardLabels, useDashboardExampleProviderProps } from './example_services';

export const CustomShellExample = () => {
  const providerProps = useDashboardExampleProviderProps();

  return (
    <ContentListProvider id="docs-custom-shell" labels={dashboardLabels} {...providerProps}>
      <EuiCallOut
        size="s"
        color="primary"
        title="Custom page content can live outside the list region."
      />
      <EuiSpacer size="m" />
      <ContentList>
        <ContentListToolbar />
        <ContentListTable title="Dashboards" />
        <ContentListFooter />
      </ContentList>
    </ContentListProvider>
  );
};
