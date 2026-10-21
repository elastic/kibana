/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Base path for the background search (search session) API. */
export const BACKGROUND_SEARCH_API_PATH = 'internal/session';

/** `elastic-api-version` header value for the background search API. */
export const BACKGROUND_SEARCH_API_VERSION = '1';

/** Upper bound for a single `_find` page — high enough that cleanup never has to paginate. */
export const BACKGROUND_SEARCH_FIND_PER_PAGE = 10_000;
