/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DASHBOARD_RESOURCE_TYPE,
  JsonObject,
  JsonStringPanel,
  PanelSummary,
  SkippedPanel,
} from '@kbn/as-code-dashboard-terraform';

/** The response body of the route converting a dashboard to Terraform. */
export interface DashboardTerraformResponseBody {
  /** The provider resource type `body` is for. */
  resource_type: typeof DASHBOARD_RESOURCE_TYPE;
  /** The resource body, in Terraform JSON syntax, with user text escaped. */
  body: JsonObject;
  /** API paths of the fields the resource has no attribute for. */
  dropped_fields: string[];
  /** Panels left out of `body` because they could not be converted. */
  skipped_panels: SkippedPanel[];
  /** Converted panels that lost fields; their fields are also in `dropped_fields`. */
  partial_panels: Array<PanelSummary & { dropped_fields: string[] }>;
  /** Panels exported whole as a JSON string. */
  json_panels: JsonStringPanel[];
  /** The provider and version the conversion was verified against. */
  provider: { source: string; version: string };
}
