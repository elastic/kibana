/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Centralized inventory of `error_type` label values emitted by this package
 * via @kbn/logging and @elastic/apm-rum. Keeping them here makes the package's
 * log signal grep-able and lets operators build dashboards or alerts without
 * searching individual source files.
 *
 * Values are PascalCase to match the existing APM `error_type` vocabulary
 * (e.g. `APMReportingFailure`, `ChartSectionNonRenderError`). The APM/log key
 * itself (`error_type`, snake_case) is written at the call sites that emit it.
 */
export const ERROR_TYPE = {
  APM_REPORTING_FAILURE: 'APMReportingFailure',
} as const;
