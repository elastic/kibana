/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** A raw Elasticsearch `_source`, in nested object or already-flattened (dotted-key) form. */
export type LeafSource = Record<string, unknown>;

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Collects every finite numeric leaf in a captured `_source` as a flat map of dotted paths to
 * values. Handles both nested (`{ system: { cpu: { total: { norm: { pct } } } } }`) and already
 * flattened (`{ 'system.cpu.total.norm.pct': 0.5 }`) document shapes, so we don't silently drop
 * fields depending on how the source cluster stored them. `@timestamp` is anchored separately and
 * is never treated as a metric.
 */
export const collectNumericLeaves = (source: LeafSource): Record<string, number> => {
  const out: Record<string, number> = {};
  const visit = (value: unknown, path: string): void => {
    if (path === '@timestamp') return;
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (path) out[path] = value;
      return;
    }
    if (isPlainObject(value)) {
      for (const [key, child] of Object.entries(value)) {
        visit(child, path ? `${path}.${key}` : key);
      }
    }
  };
  visit(source, '');
  return out;
};

/**
 * Collects every string leaf in a captured `_source` as a flat map of dotted paths to values,
 * mirroring `collectNumericLeaves`. Keyword arrays are unwrapped to their first element (the
 * dimensions/metadata we capture are scalar). `@timestamp` is never treated as a string field.
 */
export const collectStringLeaves = (source: LeafSource): Record<string, string> => {
  const out: Record<string, string> = {};
  const visit = (value: unknown, path: string): void => {
    if (path === '@timestamp') return;
    if (typeof value === 'string') {
      if (path) out[path] = value;
      return;
    }
    if (Array.isArray(value)) {
      const [first] = value;
      if (typeof first === 'string' && path) out[path] = first;
      return;
    }
    if (isPlainObject(value)) {
      for (const [key, child] of Object.entries(value)) {
        visit(child, path ? `${path}.${key}` : key);
      }
    }
  };
  visit(source, '');
  return out;
};
