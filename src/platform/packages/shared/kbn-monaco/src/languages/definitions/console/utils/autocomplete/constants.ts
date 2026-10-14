/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'] as const;

/**
 * Safeguards for request-line lookup. We scan backwards from the cursor until we find the nearest
 * request method line (GET/POST/...), but we cap the amount of work to avoid a potentially large
 * number of `getLineContent()` calls on very long documents.
 *
 * The character cap is not redundant with the line cap: pasted JSON with huge string fields can
 * hold millions of characters in only a handful of lines, and callers scan the text we return
 * character by character (see https://github.com/elastic/kibana/pull/251173).
 */
export const MAX_REQUEST_LINE_LOOKBACK_LINES = 2000;
export const MAX_REQUEST_LINE_LOOKBACK_CHARS = 100_000;
