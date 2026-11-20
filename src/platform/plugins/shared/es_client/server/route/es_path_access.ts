/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const INDEX = '{index}';
const METRIC = '{metric}';

/** Elasticsearch APIs whose path starts with one of these segments are never proxied. */
export const BLOCKED_PATH_PREFIXES = ['_security', '_encryption', '_ssl'] as const;

/** Elasticsearch paths that may be proxied, as path segments. Any method is allowed. */
export const ALLOWED_PATHS: ReadonlyArray<readonly string[]> = [
  [INDEX],
  [INDEX, '_cache', 'clear'],
  [INDEX, '_close'],
  [INDEX, '_flush'],
  [INDEX, '_forcemerge'],
  [INDEX, '_mapping'],
  [INDEX, '_open'],
  [INDEX, '_refresh'],
  [INDEX, '_settings'],
  [INDEX, '_stats'],
  [INDEX, '_stats', METRIC],
];

const decodeSegments = (path: string): string[] | undefined => {
  try {
    return path.split('/').slice(1).map(decodeURIComponent);
  } catch {
    return undefined;
  }
};

// Index names cannot start with `_`, which also keeps `_all` and Elasticsearch APIs out of index positions.
const isIndexExpression = (segment: string): boolean =>
  segment.split(',').every((indexName) => indexName.length > 0 && !indexName.startsWith('_'));

const matchesSegment = (pattern: string, segment: string): boolean => {
  if (pattern === INDEX) {
    return isIndexExpression(segment);
  }
  if (pattern === METRIC) {
    return segment.length > 0;
  }
  return pattern === segment;
};

const matchesPath = (pattern: readonly string[], segments: string[]): boolean =>
  pattern.length === segments.length &&
  pattern.every((patternSegment, i) => matchesSegment(patternSegment, segments[i]));

const isBlocked = ([firstSegment = '']: string[]): boolean => {
  const normalized = firstSegment.toLowerCase();
  return BLOCKED_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};

/**
 * Returns whether an Elasticsearch path (as returned by `getEsPath`) may be proxied: it must not
 * start with a blocked prefix and must match one of the allowed paths.
 */
export const isAllowedEsPath = (path: string): boolean => {
  const segments = decodeSegments(path);
  if (!segments || isBlocked(segments)) {
    return false;
  }
  return ALLOWED_PATHS.some((pattern) => matchesPath(pattern, segments));
};
