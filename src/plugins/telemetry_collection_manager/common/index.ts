/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PLUGIN_ID = 'telemetryCollectionManager';
export const PLUGIN_NAME = 'telemetry_collection_manager';

/**
 * The duration, in milliseconds, to cache stats
 * Currently 4 hours.
 */
const hour = 1000 * 60 * 60;
export const CACHE_DURATION_MS = 4 * hour;
