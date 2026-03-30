/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { DOC_VIEWER_VIEWED_EVENT_TYPE, DOC_VIEWER_VIEWED_ROOT_CONTENT_ID } from './constants';

export const registerDocViewerAnalyticsEvents = (analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType({
    eventType: DOC_VIEWER_VIEWED_EVENT_TYPE,
    schema: {
      contentId: {
        type: 'keyword',
        _meta: {
          description: `Doc viewer content viewed (root content ID is '${DOC_VIEWER_VIEWED_ROOT_CONTENT_ID}').`,
          optional: false,
        },
      },
      tabId: {
        type: 'keyword',
        _meta: {
          description: 'Active tab identifier within the main content.',
          optional: true,
        },
      },
    },
  });
};
