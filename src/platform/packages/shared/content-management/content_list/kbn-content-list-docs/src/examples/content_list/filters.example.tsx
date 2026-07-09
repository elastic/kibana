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
import { dashboardLabels, useDashboardExampleProviderProps } from './example_services';

const { Column } = ContentListTable;
const { Filters } = ContentListToolbar;

export const FiltersExample = () => {
  const providerProps = useDashboardExampleProviderProps({ includeSavedObjectServices: true });

  return (
    <ContentListProvider id="docs-filters" labels={dashboardLabels} {...providerProps}>
      <ContentList>
        <ContentListToolbar>
          <Filters>
            <Filters.Starred />
            <Filters.Tags />
            <Filters.CreatedBy />
            <Filters.Sort />
          </Filters>
        </ContentListToolbar>
        <ContentListTable title="Dashboards">
          <Column.Name showDescription showTags showStarred />
          <Column.CreatedBy />
          <Column.UpdatedAt />
        </ContentListTable>
        <ContentListFooter />
      </ContentList>
    </ContentListProvider>
  );
};
