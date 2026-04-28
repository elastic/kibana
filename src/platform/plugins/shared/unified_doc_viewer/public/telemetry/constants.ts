/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * EBT click tracking constants for unified_doc_viewer.
 *
 * These values populate `data-ebt-action`, `data-ebt-element`, and
 * `data-ebt-detail` HTML attributes, which map to `click.action`,
 * `click.element`, and `click.detail` fields in EBT click events.
 *
 * Cross-team actions (e.g. openInDiscover) live in @kbn/ebt-click-actions.
 *
 * Action names express user intent, not implementation. See @kbn/ebt-click-actions
 * for the full naming convention rationale.
 */

// --- Actions ---

export const EBT_CLICK_ACTION_VIEW_SERVICE = 'viewService';
export const EBT_CLICK_ACTION_VIEW_TRANSACTION = 'viewTransaction';
export const EBT_CLICK_ACTION_VIEW_DEPENDENCY = 'viewDependency';
export const EBT_CLICK_ACTION_VIEW_ERROR = 'viewError';
export const EBT_CLICK_ACTION_VIEW_SPAN = 'viewSpan';
export const EBT_CLICK_ACTION_VIEW_TRACE = 'viewTrace';
export const EBT_CLICK_ACTION_EXPAND_TRACE = 'expandTrace';
export const EBT_CLICK_ACTION_FILTER_SPAN_LINKS = 'filterSpanLinks';

// --- Elements ---

export const EBT_ELEMENT_DOC_VIEWER_ERRORS = 'docViewerErrors';
export const EBT_ELEMENT_DOC_VIEWER_SIMILAR_ERRORS = 'docViewerSimilarErrors';
export const EBT_ELEMENT_DOC_VIEWER_SPAN_LINKS = 'docViewerSpanLinks';
export const EBT_ELEMENT_DOC_VIEWER_TRACE_SUMMARY = 'docViewerTraceSummary';
export const EBT_ELEMENT_DOC_VIEWER_ABOUT = 'docViewerAbout';
export const EBT_ELEMENT_DOC_VIEWER_LOGS = 'docViewerLogs';
export const EBT_ELEMENT_DOC_VIEWER_SIMILAR_SPANS = 'docViewerSimilarSpans';

// --- Details ---

/** Span and transaction documents share the same value since they use the same viewer. */
export const EBT_DETAIL_SPAN_DOC = 'spanDoc';
export const EBT_DETAIL_LOG_DOC = 'logDoc';
