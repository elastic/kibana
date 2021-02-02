/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Roll indices every 24h
 */
export const ROLL_INDICES_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Start rolling indices after 5 minutes up
 */
export const ROLL_INDICES_START = 5 * 60 * 1000;

/**
 * Number of days to keep the UI counters saved object documents
 */
export const UI_COUNTERS_KEEP_DOCS_FOR_DAYS = 3;
