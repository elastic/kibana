/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Start monitoring the event loop utilization after 1 minute
 */
export const MONITOR_EVENT_LOOP_UTILIZATION_START = 1 * 60 * 1000;

/**
 * Check the event loop utilization every 5 seconds
 */
export const MONITOR_EVENT_LOOP_UTILIZATION_INTERVAL = 5 * 1000;
