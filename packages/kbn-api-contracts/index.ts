/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { loadOas } from './src/input/load_oas';
export { runBumpDiff } from './src/diff/run_bump_diff';
export { BumpServiceError } from './src/diff/errors';
export { parseBumpDiff } from './src/diff/parse_bump_diff';
export { applyAllowlist } from './src/diff/breaking_rules';
export { formatFailure } from './src/report/format_failure';
export { ESCALATION_LINK } from './src/report/links';
export { loadAllowlist } from './src/allowlist/load_allowlist';
export { checkTerraformImpact } from './src/terraform/check_terraform_impact';

export type { OpenAPISpec } from './src/input/load_oas';
export type { BumpDiffEntry } from './src/diff/parse_bump_diff';
export type { BreakingChange, FilterResult } from './src/diff/breaking_rules';
