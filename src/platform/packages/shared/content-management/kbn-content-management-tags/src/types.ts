/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Represents a content tag with display properties for categorizing and filtering saved objects.
 *
 * @property id - Optional unique identifier for the tag. May be undefined for newly created tags.
 * @property name - The display name of the tag shown in the UI.
 * @property description - A brief description of the tag's purpose.
 * @property color - The hex color code used for visual representation (e.g., badge background).
 * @property managed - Indicates whether the tag is system-managed (true) or user-created (false).
 */
export interface Tag {
  id?: string;
  name: string;
  description: string;
  color: string;
  managed: boolean;
}

/**
 * Represents the result of parsing a search query that may contain tag filters.
 *
 * Used to separate the text search component from tag-based filtering when processing
 * user search input in the format `tag:tagName` or `-tag:tagName`.
 *
 * @property searchQuery - The search query text with tag clauses removed.
 * @property tagIds - Optional array of tag IDs to include in the filter (must match).
 * @property tagIdsToExclude - Optional array of tag IDs to exclude from results (must not match).
 *
 * @example
 * ```ts
 * // Input: "dashboard tag:production -tag:deprecated"
 * // Result:
 * const parsed: ParsedQuery = {
 *   searchQuery: "dashboard",
 *   tagIds: ["prod-tag-id"],
 *   tagIdsToExclude: ["deprecated-tag-id"]
 * };
 * ```
 */
export interface ParsedQuery {
  searchQuery: string;
  tagIds?: string[];
  tagIdsToExclude?: string[];
}

