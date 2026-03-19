/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';

export const FLYOUT_VIEWED_EVENT_TYPE = 'flyout_viewed';

export enum FlyoutViewedContent {
  DOC_DETAIL = 'doc_detail',
  TIMELINE_WATERFALL = 'timeline_waterfall',
  SPAN_DETAIL = 'span_detail',
}

export interface FlyoutViewedEvent {
  content: FlyoutViewedContent;
  tabId?: string;
}

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

export const registerFlyoutViewedEvent = (analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType({
    eventType: FLYOUT_VIEWED_EVENT_TYPE,
    schema: {
      content: {
        type: 'keyword',
        _meta: {
          description:
            'Which flyout content is being viewed. Expected values: doc_detail, timeline_waterfall, span_detail.',
          optional: false,
        },
      },
      tabId: {
        type: 'keyword',
        _meta: {
          description:
            'The active tab identifier within the flyout. Values are content-specific (e.g. doc_view_table, doc_view_source, doc_view_logs_overview, overview, table, json). Omitted for flyouts without tabs.',
          optional: true,
        },
      },
    },
  });
};
