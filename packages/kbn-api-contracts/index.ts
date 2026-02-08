/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { loadOas } from './src/input/load_oas';
export { normalizeOas } from './src/input/normalize_oas';
export { selectBaseline } from './src/baseline/select_baseline';
export { loadBaseline } from './src/baseline/load_baseline';
export { diffOas } from './src/diff/diff_oas';
export { filterBreakingChanges } from './src/diff/breaking_rules';
export { formatFailure } from './src/report/format_failure';
export { DOCS_LINK, ESCALATION_LINK } from './src/report/links';

export type { OpenAPISpec } from './src/input/load_oas';
export type { NormalizedSpec, NormalizedOperation } from './src/input/normalize_oas';
export type { Distribution, BaselineSelection } from './src/baseline/select_baseline';
export type {
  OasDiff,
  PathDiff,
  MethodDiff,
  OperationDiff,
  OperationChange,
} from './src/diff/diff_oas';
export type { BreakingChange } from './src/diff/breaking_rules';
