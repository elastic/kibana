/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import {
  ContentList,
  ContentListFooter,
  ContentListTable,
  ContentListToolbar,
} from '@kbn/content-list';
import { dashboardListingTableStrings } from './_dashboard_listing_strings';
import {
  DashboardUnsavedListing,
  type DashboardUnsavedListingProps,
} from './dashboard_unsaved_listing';

const { Column, Action } = ContentListTable;
const { Filters } = ContentListToolbar;

export interface DashboardContentListProps extends DashboardUnsavedListingProps {
  readonly emptyState: ReactNode;
}

/** Renders the shared Dashboard content list without owning its page shell or provider. */
export const DashboardContentList = ({
  emptyState,
  ...unsavedListingProps
}: DashboardContentListProps) => (
  <>
    <DashboardUnsavedListing {...unsavedListingProps} />

    <ContentList emptyState={emptyState}>
      <ContentListToolbar>
        <Filters>
          <Filters.Sort />
          <Filters.Tags />
          <Filters.CreatedBy />
          <Filters.Starred />
        </Filters>
      </ContentListToolbar>
      <ContentListTable title={dashboardListingTableStrings.getTableListTitle()}>
        <Column.Name showDescription showTags showStarred />
        <Column.CreatedBy />
        <Column.UpdatedAt />
        <Column.Actions>
          <Action.Edit />
          <Action.ContentEditor />
        </Column.Actions>
      </ContentListTable>

      <ContentListFooter />
    </ContentList>
  </>
);
