/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Centralized inventory of label values emitted by this package via
 * @kbn/logging. Keeping them here makes the package's log signal grep-able
 * and lets operators build dashboards or alerts without searching individual
 * source files.
 *
 * Label keys (e.g. `error_type`) use snake_case to match the package's APM
 * label vocabulary, so operators can query the same field name across logs
 * and APM.
 */
export const ERROR_TYPE = {
  APM_REPORTING_FAILURE: 'APMReportingFailure',
} as const;
