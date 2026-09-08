/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared EUI flyout history key for the Document Viewer flyout and any nested flyouts
 * (e.g. Trace Waterfall). Using the same key groups them into a single back-button
 * navigation history, enabling "Back" to return from a nested flyout to the Document Viewer.
 *
 * This is used by the unified-doc-viewer and security_solution plugins.
 */
export const DOC_VIEWER_FLYOUT_HISTORY_KEY = Symbol.for('docViewerFlyout');
