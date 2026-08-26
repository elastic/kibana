/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const TRACE_WATERFALL_EBT_CLICK_ACTIONS = {
  VIEW_FULL_TRACE: 'viewFullTrace',
  SCROLL_TO_ORIGIN: 'scrollToOrigin',
} as const;

export const TRACE_WATERFALL_EBT_ELEMENTS = {
  WATERFALL_ROW: 'waterfallRow',
  WATERFALL_ERROR_BADGE: 'waterfallErrorBadge',
  WATERFALL_SERVICE_BADGE: 'waterfallServiceBadge',
  WATERFALL_HEADER: 'waterfallHeader',
  WATERFALL_VIEW_FULL_TRACE: 'waterfallViewFullTrace',
  FLYOUT_WATERFALL_ROW: 'flyoutWaterfallRow',
  FLYOUT_WATERFALL_ERROR_BADGE: 'flyoutWaterfallErrorBadge',
  FLYOUT_WATERFALL_SERVICE_BADGE: 'flyoutWaterfallServiceBadge',
  FLYOUT_WATERFALL_FOOTER: 'flyoutWaterfallFooter',
  FLYOUT_WATERFALL_SCROLL_TO_ORIGIN: 'flyoutWaterfallScrollToOrigin',
} as const;
