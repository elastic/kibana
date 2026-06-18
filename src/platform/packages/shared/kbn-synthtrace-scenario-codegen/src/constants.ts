/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * License header prepended to every generated scenario module so the downloaded
 * file passes the repository license check when committed.
 */
export const LICENSE_HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */`;

/**
 * The capture is always clamped to (at most) this much of the most recent part of the
 * selected time range. This bounds how much data Elasticsearch has to scan regardless of
 * how wide a range the user picked (e.g. "last 10 years"), and ensures we reconstruct the
 * most recent data (what the user is actually looking at) rather than the oldest.
 */
export const CAPTURE_MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Maximum page size accepted by Elasticsearch for a single search request. */
export const MAX_ITEMS_PER_PAGE = 10000;
