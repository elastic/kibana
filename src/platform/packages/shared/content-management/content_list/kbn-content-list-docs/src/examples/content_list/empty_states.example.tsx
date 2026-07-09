/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
} from '@kbn/content-list';
import { DashboardListingEmptyPromptMock } from '../../stories_helpers';
import { dashboardLabels, useDashboardExampleProviderProps } from './example_services';

export const EmptyStatesExample = () => {
  const providerProps = useDashboardExampleProviderProps({ isEmpty: true });

  return (
    <ContentListProvider id="docs-empty-state" labels={dashboardLabels} {...providerProps}>
      <ContentList emptyState={<DashboardListingEmptyPromptMock />}>
        <ContentListToolbar />
        <ContentListTable title="Dashboards" />
        <ContentListFooter />
      </ContentList>
    </ContentListProvider>
  );
};
