/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const DEFAULT_HIGHLIGHT_PRE_TAG = '<em>';
export declare const DEFAULT_HIGHLIGHT_POST_TAG = '</em>';
export interface ESQLHighlightTags {
  preTag: string;
  postTag: string;
}
export type ESQLColumnsWithHighlights = Record<string, ESQLHighlightTags>;
/**
 * Returns columns built using a highlighting algorithm,
 * including the opening and closing markup tags configured for each column.
 *
 * Example:
 * ```
 * FROM books
 *  | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "highlight": true })
 *  | EVAL titles = TOP_SNIPPETS(title, "Tolkien", { "highlight": true, "pre_tag": "<mark>", "post_tag": "</mark>" })
 *  | HIGHLIGHT "Tolkien" ON author
 * ```
 * Will return the following map:
 * ```
 * {
 *   snippets: {
 *     preTag: '<em>',
 *     postTag: '</em>',
 *   },
 *   titles: {
 *     preTag: '<mark>',
 *     postTag: '</mark>',
 *   },
 *   highlight_author: {
 *     preTag: '<em>',
 *     postTag: '</em>',
 *   },
 * }
 */
export declare function getColumnsWithHighlights(query: string): ESQLColumnsWithHighlights;
