/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** The `url.template` attribute, which EDOT Browser adds to the logs of a page. */
export const URL_TEMPLATE = 'url.template';

/** The event of the resource timing entries, which describe a request and not the page. */
export const RESOURCE_TIMING_EVENT = 'browser.resource_timing';

const ID_SEGMENT_PATTERNS: readonly RegExp[] = [
  // numeric
  /^\d+$/,
  // UUID
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  // hashes and object IDs, e.g. MongoDB's
  /^(?=.*\d)[0-9a-f]{16,}$/i,
  // ULID
  /^[0-7][0-9a-hjkmnp-tv-z]{25}$/i,
];

/**
 * The route EDOT Browser infers from a page path when the app sets none: ID-like segments
 * (numbers, UUIDs, hashes and ULIDs) become `{id}` and the query is dropped. Other segments, such
 * as the slug of `/products/trail-running-shoes`, stay as they are.
 */
export const inferPageRoute = (path: string): string => {
  const [pathname] = path.split(/[?#]/);
  return pathname
    .split('/')
    .map((segment) =>
      ID_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment)) ? '{id}' : segment
    )
    .join('/');
};
