/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * `location.state` contract of the workflows app's template-import page
 * (`/app/workflows/library/import`). The catalog's "Install template from
 * file" flow parses an uploaded template client-side and hands the raw YAML to
 * the import page through this history state:
 *
 * ```ts
 * history.push('/library/import', { customTemplateYaml } satisfies WorkflowsImportRouteState);
 * ```
 *
 * Like {@link WorkflowsCreateRouteState}, the state travels on the history
 * entry rather than the URL: it survives back/forward navigation but is not
 * shareable, so a reload of `/library/import` (no state) falls back to the
 * catalog.
 */
export interface WorkflowsImportRouteState {
  /** Raw template YAML (with its `template-metadata` block) to set up and install. */
  customTemplateYaml?: string;
}
