/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren } from 'react';

import { I18nProvider } from '@kbn/i18n-react';
import { QueryClientProvider } from '@kbn/react-query';
import { ContentEditorKibanaProvider } from '@kbn/content-management-content-editor';

import { coreServices, savedObjectsTaggingService } from '../../services/kibana_services';
import { dashboardQueryClient } from '../../services/dashboard_query_client';

// `SavedObjectsTaggingApi.ui.components.SavedObjectSaveModalTagSelector` is
// typed against `EuiComboBoxProps<Tag>`, while `ContentEditorKibanaProvider`
// declares it against `EuiComboBoxProps<unknown>`. EUI's combo-box generic is
// contravariant on `onChange`, so the assignment requires a cast even though
// the runtime shapes match. `TableListViewKibanaProvider` performs the same
// cast under the hood.
type ContentEditorTaggingApi = React.ComponentProps<
  typeof ContentEditorKibanaProvider
>['savedObjectsTagging'];

export interface DashboardListingProvidersProps {
  /**
   * When `true`, wraps the children in the dashboard-scoped
   * `QueryClientProvider`. The page entry needs this for the dashboard-app's
   * own queries; the embed entry inherits its host page's query client and
   * shouldn't double-mount one here.
   */
  withQueryClient?: boolean;
}

/**
 * Shared provider stack for the dashboard listing UI.
 *
 * `I18nProvider` and `ContentEditorKibanaProvider` are required by both the
 * page (`DashboardListing`) and the embeddable (`DashboardListingTable`):
 * `useDashboardListingTable` calls `useOpenContentEditor`, which throws if
 * `ContentEditorKibanaProvider` isn't an ancestor.
 *
 * Pass `withQueryClient` to additionally wrap the content in the dashboard
 * `QueryClientProvider` (page-only).
 */
export const DashboardListingProviders = ({
  withQueryClient,
  children,
}: PropsWithChildren<DashboardListingProvidersProps>) => {
  const editorTree = (
    <ContentEditorKibanaProvider
      core={coreServices}
      savedObjectsTagging={savedObjectsTaggingService?.getTaggingApi() as ContentEditorTaggingApi}
    >
      {children}
    </ContentEditorKibanaProvider>
  );

  return (
    <I18nProvider>
      {withQueryClient ? (
        <QueryClientProvider client={dashboardQueryClient}>{editorTree}</QueryClientProvider>
      ) : (
        editorTree
      )}
    </I18nProvider>
  );
};
