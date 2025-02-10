/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Roll indices every hour
 */
export const ROLL_INDICES_INTERVAL = 3600_000;

/**
 * Start rolling indices after 5 minutes up
 */
export const ROLL_INDICES_START = 5 * 60 * 1000;

/**
 * Number of days to keep the Usage counters saved object documents
 */
export const USAGE_COUNTERS_KEEP_DOCS_FOR_DAYS = 5;
