/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import { FLYOUT_VIEWED_EVENT_TYPE, FLYOUT_ROOT_CONTENT_ID } from './constants';

export const registerDocViewerAnalyticsEvents = (analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType({
    eventType: FLYOUT_VIEWED_EVENT_TYPE,
    schema: {
      contentId: {
        type: 'keyword',
        _meta: {
          description: `Flyout content viewed (root content ID is '${FLYOUT_ROOT_CONTENT_ID}').`,
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
