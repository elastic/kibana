/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Roll daily indices every 24h
 */
export const ROLL_DAILY_INDICES_INTERVAL = 24 * 60 * 60 * 1000;

/**
 * Start rolling indices after 5 minutes up
 */
export const ROLL_INDICES_START = 5 * 60 * 1000;

/**
 * Reset the event loop delay historgram every 1 hour
 */
export const MONITOR_EVENT_LOOP_DELAYS_INTERVAL = 1 * 60 * 60 * 1000;

/**
 * Reset the event loop delay historgram every 24h
 */
export const MONITOR_EVENT_LOOP_DELAYS_RESET = 24 * 60 * 60 * 1000;

/**
 * Start monitoring the event loop delays after 1 minute
 */
export const MONITOR_EVENT_LOOP_DELAYS_START = 1 * 60 * 1000;

/**
 * Event loop monitoring sampling rate in milliseconds.
 */
export const MONITOR_EVENT_LOOP_DELAYS_RESOLUTION = 10;
