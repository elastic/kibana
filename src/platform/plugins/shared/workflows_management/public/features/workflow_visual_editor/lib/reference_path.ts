/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const PLAIN_SEGMENT = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * Adds one segment to a Liquid path: `.name` for a plain identifier, `["name"]` for anything
 * else (spaces, dots, quotes), which Liquid cannot read after a dot.
 */
export const appendPathSegment = (path: string, segment: string): string => {
  if (PLAIN_SEGMENT.test(segment)) return path ? `${path}.${segment}` : segment;
  return `${path}[${JSON.stringify(segment)}]`;
};
