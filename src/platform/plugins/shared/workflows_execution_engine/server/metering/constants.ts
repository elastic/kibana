/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** The metered dimension type registered with the Billing team. */
export const WORKFLOWS_USAGE_TYPE = 'workflows_execution';

/** Source ID prefix for traceability in billing logs. */
export const METERING_SOURCE_ID = 'kib-workflows-metering';

/** Duration normalization bucket size in minutes. */
export const BUCKET_SIZE_MINUTES = 5;

/** Duration normalization bucket size in milliseconds. */
export const BUCKET_SIZE_MS = BUCKET_SIZE_MINUTES * 60 * 1000;
