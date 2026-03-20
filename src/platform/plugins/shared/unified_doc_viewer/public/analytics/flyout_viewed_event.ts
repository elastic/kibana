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
export enum FlyoutContentId {
  DOC_DETAIL = 'doc_detail',
  TRACE_TIMELINE = 'trace_timeline',
  SPAN_DETAIL = 'span_detail',
  LOG_DETAIL = 'log_detail',
}

/**
 * Payload for the `flyout_viewed` event.
 *
 * @property contentId Identifies which flyout content is being viewed.
 * @property tabId Active tab identifier within the flyout.
 */
export interface FlyoutViewedEvent {
  contentId: FlyoutContentId;
  tabId?: string;
}

/**
 * Reports a `flyout_viewed` telemetry event.
 */
export const reportFlyoutViewedEvent = (
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'> | undefined,
  { contentId, tabId }: FlyoutViewedEvent
) => {
  if (!analytics) return;

  analytics.reportEvent(FLYOUT_VIEWED_EVENT_TYPE, {
    contentId,
    tabId,
  });
};
