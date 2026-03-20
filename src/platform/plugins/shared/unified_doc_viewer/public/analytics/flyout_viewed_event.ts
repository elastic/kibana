/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import { FLYOUT_VIEWED_EVENT_TYPE } from '../plugin';

/**
 * Identifies which flyout content is being viewed.
 */
export enum FlyoutViewedContent {
  DOC_DETAIL = 'doc_detail',
  TIMELINE_WATERFALL = 'timeline_waterfall',
  SPAN_DETAIL = 'span_detail',
}

/**
 * Payload for the `flyout_viewed` event.
 *
 * @property content -Identifies which flyout content is being viewed.
 * @property tabId - Active tab identifier within the flyout. For document flyouts this is typically
 * the `DocView` id (e.g. `doc_view_table`, `doc_view_source`, `doc_view_logs_overview`).
 */
export interface FlyoutViewedEvent {
  content: FlyoutViewedContent;
  tabId?: string;
}

/**
 * Reports a `flyout_viewed` telemetry event.
 */
export const reportFlyoutViewedEvent = (
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'> | undefined,
  { content, tabId }: FlyoutViewedEvent
) => {
  if (!analytics) return;

  analytics.reportEvent(FLYOUT_VIEWED_EVENT_TYPE, {
    content,
    tabId,
  });
};
