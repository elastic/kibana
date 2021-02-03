/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const NEWSFEED_FALLBACK_LANGUAGE = 'en';
export const NEWSFEED_FALLBACK_FETCH_INTERVAL = 86400000; // 1 day
export const NEWSFEED_FALLBACK_MAIN_INTERVAL = 120000; // 2 minutes
export const NEWSFEED_LAST_FETCH_STORAGE_KEY = 'newsfeed.lastfetchtime';
export const NEWSFEED_HASH_SET_STORAGE_KEY = 'newsfeed.hashes';

export const NEWSFEED_DEFAULT_SERVICE_BASE_URL = 'https://feeds.elastic.co';
export const NEWSFEED_DEV_SERVICE_BASE_URL = 'https://feeds-staging.elastic.co';
export const NEWSFEED_DEFAULT_SERVICE_PATH = '/kibana/v{VERSION}.json';
