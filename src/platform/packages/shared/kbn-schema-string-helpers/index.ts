/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  STRING_HELPER_DEFAULTS,
  getStringHelperLimits,
  assertUnboundedStringReason,
  assertValidMinLength,
  BOUNDED_STRING_HELPER,
  BOUNDED_STRING_MAX_LENGTH,
  LABEL_REQUIRED_HELPERS,
  X_KIBANA_PLANNED_MIN_LENGTH,
  X_KIBANA_PLANNED_MAX_LENGTH,
  getBoundedStringLimits,
  assertStringHelperLabel,
} from './limits';
export type {
  StringHelperName,
  StringHelperLimits,
  ReportedStringHelperName,
  LabelRequiredHelperName,
} from './limits';
export { reportStringLengthViolation } from './report_string_length_violation';
export type { StringLengthBound } from './report_string_length_violation';
