/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface WorkflowExampleEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  /** Filename relative to the examples directory (e.g. "basic.yml") */
  filename: string;
}
/**
 * Catalog of bundled workflow examples. Metadata only -- YAML content is loaded
 * at runtime on the server via `loadWorkflowExampleContent()`.
 *
 * To add a new example: drop a .yml/.yaml file in this directory, then add an
 * entry here. Guard the `id` in `WORKFLOW_EXAMPLE_IDS` below.
 */
export declare const WORKFLOW_EXAMPLES: WorkflowExampleEntry[];
/** Allowlisted example IDs — prevents path traversal attacks when reading files */
export declare const WORKFLOW_EXAMPLE_IDS: Set<string>;
/**
 * Get workflow example catalog entries, optionally filtered by category and/or search term.
 * Returns metadata only (no YAML content).
 */
export declare function getWorkflowExamples(filter?: {
  category?: string;
  search?: string;
}): WorkflowExampleEntry[];
/**
 * Look up a single catalog entry by id.
 */
export declare function getWorkflowExample(id: string): WorkflowExampleEntry | undefined;
/**
 * Absolute path to the bundled examples directory.
 * Works in both dev and production because it uses `__dirname`.
 * Server-side callers can combine this with `readFileSync` to load YAML content.
 */
export declare function getWorkflowExamplesDir(): string;
