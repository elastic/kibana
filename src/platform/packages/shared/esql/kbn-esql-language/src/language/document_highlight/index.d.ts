/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface DocumentHighlightItem {
  start: number;
  end: number;
}
/**
 * Returns all occurrences of the field (column) at the given offset in the query.
 * If the cursor is not on a column node, returns an empty array.
 */
export declare function getDocumentHighlightItems(
  fullText: string,
  offset: number
): DocumentHighlightItem[];
export {};
