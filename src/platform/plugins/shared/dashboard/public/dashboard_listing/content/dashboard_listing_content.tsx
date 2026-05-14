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
  ContentListTable,
  ContentListToolbar,
  ContentListFooter,
} from '@kbn/content-list';
import { ContentListClientProvider } from '@kbn/content-list-provider-client';
import type { ViewMode } from '@kbn/presentation-publishing';
import { DashboardUnsavedListing } from '../dashboard_unsaved_listing';
import type { DashboardListingTableBundle } from '../hooks/use_dashboard_listing_table';

const { Column, Action } = ContentListTable;
const { Filters } = ContentListToolbar;

export interface DashboardListingContentProps {
  /** Bundle returned by `useDashboardListingTable`. */
  bundle: DashboardListingTableBundle;
  /** Navigate to a dashboard, optionally in a specific view mode. */
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
}

/**
 * Shared content for the dashboard listing page and embeddable.
 *
 * Renders:
 * - the unsaved-dashboards banner (self-subscribed via
 *   `useUnsavedDashboardIds`),
 * - the toolbar with the starred / recents / tags / created-by / sort
 *   filters, and
 * - the table (Name, CreatedBy, UpdatedAt, Actions) with footer/empty-state.
 *
 * All data wiring is supplied by `useDashboardListingTable` via
 * `bundle.providerProps`; this component is responsible only for layout.
 */
export const DashboardListingContent = ({
  bundle,
  goToDashboard,
}: DashboardListingContentProps) => (
  <ContentListClientProvider {...bundle.providerProps}>
    <DashboardUnsavedListing goToDashboard={goToDashboard} />
    <ContentList emptyState={bundle.emptyPrompt}>
      <ContentListToolbar>
        <Filters>
          <Filters.Starred />
          {bundle.toolbarFilters}
          <Filters.Tags />
          <Filters.CreatedBy />
          <Filters.Sort />
        </Filters>
      </ContentListToolbar>
      <ContentListTable title="Dashboards">
        <Column.Name showDescription showTags showStarred />
        <Column.CreatedBy />
        <Column.UpdatedAt />
        <Column.Actions>
          <Action.Inspect />
          <Action.Edit {...bundle.itemActionGuard} />
          <Action.Delete {...bundle.itemActionGuard} />
        </Column.Actions>
      </ContentListTable>
      <ContentListFooter />
    </ContentList>
  </ContentListClientProvider>
);
