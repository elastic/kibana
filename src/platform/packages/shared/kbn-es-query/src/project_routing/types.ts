/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Project routing configuration for cross-project search (CPS).
 * Defines which projects should be included in the search scope.
 *
 * This is used in serverless environments to control whether searches
 * are scoped to a single project or span multiple projects.
 *
 * Examples:
 * - { type: 'origin' } - Search only in the current project (default)
 * - { type: 'all' } - Search across all projects
 * - { type: 'custom', projects: ['project-1', 'project-2'] } - Search specific projects, not implemented yet
 *
 * @public
 */
export type ProjectRouting =
  | { type: 'origin' }
  | { type: 'all' }
  | { type: 'custom'; projects: string[] };
