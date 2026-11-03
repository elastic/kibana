/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { buildAttributeTree } from './src/attribute_tree';
export type { AttributeTree } from './src/attribute_tree';
export {
  createDashboardConverter,
  DashboardConversionError,
  linkReferences,
} from './src/convert_dashboard';
export type {
  DashboardConversion,
  DashboardConverter,
  JsonObject,
  JsonStringPanel,
  JsonValue,
  Link,
  LinkedConversion,
  LinkedResource,
  PanelSummary,
  PartialPanel,
  Reference,
  ReferencedObject,
  SkippedPanel,
  TerraformPath,
} from './src/convert_dashboard';
export { loadDashboardOas } from './src/dashboard_oas';
export { DASHBOARD_RESOURCE_TYPE, TAG_RESOURCE, TERRAFORM_PROVIDER } from './src/provider';
export { toResourceName } from './src/resource_name';
