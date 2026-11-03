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
  LinkedResource,
  PanelSummary,
  SkippedPanel,
} from '@kbn/as-code-dashboard-terraform';

/** A tag the dashboard keeps as its literal ID: Kibana manages it, or the user cannot read it (or it is missing). */
export type LiteralTag =
  | { id: string; reason: 'managed'; name: string }
  | { id: string; reason: 'unreadable' };

/** The response body of the route converting a dashboard to Terraform. */
export interface DashboardTerraformResponseBody {
  /** The provider resource type `body` is for. */
  resource_type: typeof DASHBOARD_RESOURCE_TYPE;
  /** The name of the dashboard's resource, from its title. */
  resource_name: string;
  /** The resource body, in Terraform JSON syntax: user text escaped, references to `resources` not. */
  body: JsonObject;
  /** Resources written for the objects the dashboard refers to (its readable, unmanaged tags); they pin no ID. */
  resources: LinkedResource[];
  /** The tag resource type, and the oldest Kibana Terraform can apply it to. */
  tag_resource: { type: string; min_kibana_version: string };
  /** The dashboard's tags that stay literal IDs, with no resource. */
  literal_tags: LiteralTag[];
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
