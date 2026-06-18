/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Renders a string as a single-quoted, escaped TypeScript string literal. */
export const quote = (value: string): string =>
  `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const isValidIdentifier = (key: string): boolean => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);

/** Renders an object key, quoting it only when it is not a valid bare identifier. */
export const formatKey = (key: string): string => (isValidIdentifier(key) ? key : quote(key));

/** Renders an arbitrary JSON-like value as TypeScript source. */
export const formatValue = (value: unknown): string => {
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(formatValue).join(', ')}]`;
  if (typeof value === 'object') return formatObject(value as Record<string, unknown>);
  return 'undefined';
};

/** Renders an object literal as TypeScript source, dropping `undefined` entries. */
export const formatObject = (obj: Record<string, unknown>): string => {
  const entries = Object.entries(obj).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return '{}';
  return `{ ${entries
    .map(([key, value]) => `${formatKey(key)}: ${formatValue(value)}`)
    .join(', ')} }`;
};
