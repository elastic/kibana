/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const TRACES_DOC_VIEWER_EBT_CLICK_ACTIONS = {
  VIEW_TRANSACTION: 'viewTransaction',
  VIEW_DEPENDENCY: 'viewDependency',
  VIEW_TRACE: 'viewTrace',
  EXPAND_TRACE: 'expandTrace',
  FILTER_SPAN_LINKS: 'filterSpanLinks',
} as const;

export const TRACES_DOC_VIEWER_EBT_ELEMENTS = {
  ERRORS: 'docViewerErrors',
  SPAN_LINKS: 'docViewerSpanLinks',
  TRACE_SUMMARY: 'docViewerTraceSummary',
  TRACE_SUMMARY_EXPAND_BUTTON: 'docViewerTraceSummaryExpandButton',
  TRACE_SUMMARY_WATERFALL_AREA: 'docViewerTraceSummaryWaterfallArea',
  ABOUT: 'docViewerAbout',
  LOGS: 'docViewerLogs',
  SIMILAR_SPANS: 'docViewerSimilarSpans',
  WATERFALL_ROW: 'docViewerWaterfallRow',
  WATERFALL_ERROR_BADGE: 'docViewerWaterfallErrorBadge',
  WATERFALL_SERVICE_BADGE: 'docViewerWaterfallServiceBadge',
} as const;

export const TRACES_DOC_VIEWER_EBT_DETAILS = {
  SPAN_DOC: 'spanDoc',
  LOG_DOC: 'logDoc',
} as const;
