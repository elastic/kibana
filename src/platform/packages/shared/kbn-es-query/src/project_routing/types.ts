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
 *
 * Used in serverless environments to control whether searches are scoped to a single project or span multiple projects.
 *
 * Examples:
 * - undefined - Search across all projects (default)
 * - '_alias:_origin' - Search only in the current project
 * - '_alias:*' - Search across all projects (explicit)
 *
 * @public
 */
export type ProjectRouting = undefined | '_alias:_origin' | '_alias:*';
