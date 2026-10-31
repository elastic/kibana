/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFormRow, EuiIconTip, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ActivityView,
  ContentInsightsProvider,
  ViewsStats,
  type ContentInsightsClientPublic,
} from '@kbn/content-management-content-insights-public';
import type { ContentListItem } from '@kbn/content-list-provider';

/**
 * Props for {@link SavedObjectActivityRow}.
 */
export interface SavedObjectActivityRowProps {
  /**
   * Content-insights client for this listing's domain (typically built with
   * {@link createContentInsightsService}). Wrapped in a fresh
   * `ContentInsightsProvider` so the component works inside the content
   * editor flyout, which renders outside the listing's React tree.
   */
  service: ContentInsightsClientPublic;
  /**
   * The item being inspected. The row reads `createdBy`, `createdAt`,
   * `updatedBy`, `updatedAt`, and `managed` for the activity card and uses
   * `id` to fetch view stats.
   */
  item: ContentListItem;
  /** Plural entity label used by the activity card's "no creator/updater" tip. */
  entityNamePlural?: string;
  /**
   * Whether Kibana versioning is enabled.
   */
  isKibanaVersioningEnabled?: boolean;
}

/**
 * Activity row for the content editor flyout — renders the shared
 * `ActivityView` plus `ViewsStats` inside a `ContentInsightsProvider`.
 *
 * Drop into `contentEditor.appendRows`:
 *
 * ```tsx
 * contentEditor={{
 *   appendRows: (item) => (
 *     <SavedObjectActivityRow service={insights} item={item} entityNamePlural="dashboards" />
 *   ),
 * }}
 * ```
 *
 * Wraps a fresh provider on every mount because the flyout renders outside
 * the listing's tree, so we cannot rely on a parent provider being in scope.
 */
export const SavedObjectActivityRow = ({
  service,
  item,
  entityNamePlural,
  isKibanaVersioningEnabled,
}: SavedObjectActivityRowProps) => {
  const activityItem = {
    createdAt: item.createdAt,
    createdBy: item.createdBy,
    updatedAt: item.updatedAt?.toISOString(),
    updatedBy: item.updatedBy,
    managed: item.managed,
  };

  return (
    <ContentInsightsProvider
      contentInsightsClient={service}
      isKibanaVersioningEnabled={isKibanaVersioningEnabled}
    >
      <EuiFormRow
        fullWidth
        label={
          <>
            <FormattedMessage
              id="contentManagement.contentListProviderClient.contentEditor.activityLabel"
              defaultMessage="Activity"
            />{' '}
            <EuiIconTip
              type="info"
              iconProps={{ style: { verticalAlign: 'bottom' } }}
              content={
                <FormattedMessage
                  id="contentManagement.contentListProviderClient.contentEditor.activityLabelHelpText"
                  defaultMessage="Activity data is auto-generated and cannot be updated."
                />
              }
            />
          </>
        }
      >
        <>
          <ActivityView item={activityItem} entityNamePlural={entityNamePlural} />
          <EuiSpacer size="s" />
          <ViewsStats item={item} />
        </>
      </EuiFormRow>
    </ContentInsightsProvider>
  );
};
