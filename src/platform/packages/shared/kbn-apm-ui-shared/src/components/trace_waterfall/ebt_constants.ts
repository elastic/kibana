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
  /** User opens the span links details for a waterfall item. */
  VIEW_SPAN_LINKS: 'viewSpanLinks',
  /** User expands/collapses a single waterfall row's children. */
  TOGGLE_ACCORDION: 'toggleAccordion',
  /** User folds/unfolds the entire waterfall tree from the header button. */
  TOGGLE_ALL_ROWS: 'toggleAllWaterfallRows',
} as const;

export const TRACE_WATERFALL_EBT_ELEMENTS = {
  WATERFALL_ROW: 'waterfallRow',
  WATERFALL_ERROR_BADGE: 'waterfallErrorBadge',
  WATERFALL_SERVICE_BADGE: 'waterfallServiceBadge',
  WATERFALL_HEADER: 'waterfallHeader',
  WATERFALL_VIEW_FULL_TRACE: 'waterfallViewFullTrace',
  WATERFALL_ROW_TOGGLE: 'waterfallRowToggle',
  WATERFALL_SPAN_LINKS_BADGE: 'waterfallSpanLinksBadge',
  WATERFALL_ERROR_MARKER: 'waterfallErrorMarker',
  WATERFALL_ERROR_MARKER_MESSAGE: 'waterfallErrorMarkerMessage',
  WATERFALL_FOLD_BUTTON: 'waterfallFoldButton',
  WATERFALL_SIZE_WARNING_DISCOVER_LINK: 'waterfallSizeWarningDiscoverLink',
  FLYOUT_WATERFALL_ROW: 'flyoutWaterfallRow',
  FLYOUT_WATERFALL_ERROR_BADGE: 'flyoutWaterfallErrorBadge',
  FLYOUT_WATERFALL_SERVICE_BADGE: 'flyoutWaterfallServiceBadge',
  FLYOUT_WATERFALL_FOOTER: 'flyoutWaterfallFooter',
  FLYOUT_WATERFALL_SCROLL_TO_ORIGIN: 'flyoutWaterfallScrollToOrigin',
  FLYOUT_WATERFALL_ROW_TOGGLE: 'flyoutWaterfallRowToggle',
  FLYOUT_WATERFALL_SPAN_LINKS_BADGE: 'flyoutWaterfallSpanLinksBadge',
  FLYOUT_WATERFALL_ERROR_MARKER: 'flyoutWaterfallErrorMarker',
  FLYOUT_WATERFALL_ERROR_MARKER_MESSAGE: 'flyoutWaterfallErrorMarkerMessage',
  FLYOUT_WATERFALL_FOLD_BUTTON: 'flyoutWaterfallFoldButton',
} as const;
