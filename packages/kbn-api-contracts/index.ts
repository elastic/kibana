/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { loadOas } from './src/input/load_oas';
export { runOasdiff, parseOasdiff, applyAllowlist } from './src/diff';
export type { OasdiffEntry, BreakingChange, FilterResult } from './src/diff';
export { formatFailure } from './src/report/format_failure';
export { ESCALATION_LINK } from './src/report/links';
export { loadAllowlist } from './src/allowlist/load_allowlist';
export { checkTerraformImpact } from './src/terraform/check_terraform_impact';
