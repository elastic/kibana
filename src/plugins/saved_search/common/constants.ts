/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const SavedSearchType = 'search';
// While the legacy SO name has to stay "search" the display name can be customized.
// We can allow users to filter their SOs by the old `search` name and the new `discover session` name
// if we define the display name as a combination of them: "discover session / search".
export const SavedSearchTypeDisplayName = 'discover session / search';

export const LATEST_VERSION = 1;

export const MIN_SAVED_SEARCH_SAMPLE_SIZE = 1;
export const MAX_SAVED_SEARCH_SAMPLE_SIZE = 10000;

export type SavedSearchContentType = typeof SavedSearchType;
