/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const SavedSearchType = 'search';

export const LATEST_VERSION = 1;

export const MIN_SAVED_SEARCH_SAMPLE_SIZE = 1;
export const MAX_SAVED_SEARCH_SAMPLE_SIZE = 10000;

export type SavedSearchContentType = typeof SavedSearchType;
