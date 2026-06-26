/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Centralized inventory of `error_type` label values emitted by chart-section
 * error reporting via @kbn/logging and @elastic/apm-rum. Keeping the values in
 * one place makes the package's log/APM signal grep-able and lets operators
 * build dashboards or alerts without hunting through source files.
 *
 * Values are PascalCase to match the existing APM `error_type` vocabulary. The
 * label key itself (`error_type`, snake_case) is written at the call sites
 * that emit it.
 */
export const ERROR_TYPE = {
  APM_REPORTING_FAILURE: 'APMReportingFailure',
  CHART_SECTION_NON_RENDER_ERROR: 'ChartSectionNonRenderError',
} as const;
