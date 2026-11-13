/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** The reserved key of `data.map` that turns a nested field into an array (`MAP_DIRECTIVE`). */
export const MAP_DIRECTIVE_KEY = '$map';

/** True when the value has a `$map` key, at any depth, in an object or inside a list. */
export const containsMapDirective = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsMapDirective);
  if (value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, entry]) => key === MAP_DIRECTIVE_KEY || containsMapDirective(entry)
  );
};
