/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';
import { EuiFormRow, EuiIconTip, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ActivityView,
  ViewsStats,
  ContentInsightsProvider,
  type ContentInsightsClientPublic,
} from '@kbn/content-management-content-insights-public';
import type { ContentListItem } from '../../item';

interface DefaultActivityRowsProps {
  /** The content list item to display activity for. */
  item: ContentListItem;
  /** Plural entity name (e.g., "dashboards", "maps"). */
  entityNamePlural: string;
  /** Content insights client for fetching view stats. */
  contentInsightsClient: ContentInsightsClientPublic;
}

/**
 * Default activity rows component for the content editor flyout.
 *
 * Displays:
 * - Created by / Updated by information via `ActivityView`.
 * - View statistics via `ViewsStats`.
 *
 * This component is automatically used when `features.contentEditor: true`
 * and `contentInsightsClient` is provided. It wraps `ViewsStats` with
 * `ContentInsightsProvider` because the flyout renders in a separate React
 * tree without access to the parent context.
 */
export const DefaultActivityRows: FC<DefaultActivityRowsProps> = ({
  item,
  entityNamePlural,
  contentInsightsClient,
}) => {
  // Convert ContentListItem to the format expected by ActivityView.
  // ActivityView expects dates as ISO strings.
  const activityItem = {
    id: item.id,
    createdAt: item.createdAt?.toISOString(),
    createdBy: item.createdBy,
    updatedAt: item.updatedAt?.toISOString(),
    updatedBy: item.updatedBy,
    managed: item.isManaged,
  };

  // ViewsStats needs an item with id for the query key.
  const viewsStatsItem = { id: item.id } as Parameters<typeof ViewsStats>[0]['item'];

  return (
    <EuiFormRow
      fullWidth
      label={
        <>
          <FormattedMessage
            id="contentManagement.contentList.contentEditor.activityLabel"
            defaultMessage="Activity"
          />{' '}
          <EuiIconTip
            type="info"
            iconProps={{ style: { verticalAlign: 'bottom' } }}
            content={
              <FormattedMessage
                id="contentManagement.contentList.contentEditor.activityLabelHelpText"
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
        {/* Wrap ViewsStats with ContentInsightsProvider because the flyout renders in a
            separate React tree (via Kibana overlay service) without access to the parent context. */}
        <ContentInsightsProvider contentInsightsClient={contentInsightsClient}>
          <ViewsStats item={viewsStatsItem} />
        </ContentInsightsProvider>
      </>
    </EuiFormRow>
  );
};
