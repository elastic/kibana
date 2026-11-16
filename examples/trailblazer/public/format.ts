/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type Primitive = string | number | boolean | null;

export interface FlatField {
  readonly path: string;
  readonly value: Primitive;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

export function formatCount(count: number): string {
  return count.toLocaleString();
}

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${BYTE_UNITS[unit]}`;
}

export function formatDate(value: string | number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatValue(value: Primitive): string {
  if (value === null) return 'null';
  return typeof value === 'string' ? value : String(value);
}

export function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

/** Flattens a document source into dotted field paths; array elements share their parent path. */
export function flattenSource(source: Record<string, unknown>): FlatField[] {
  const fields: FlatField[] = [];
  visit(source, '', fields);
  return fields.sort((a, b) => a.path.localeCompare(b.path));
}

function visit(value: unknown, path: string, out: FlatField[]) {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, path, out);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      visit(child, path ? `${path}.${key}` : key, out);
    }
    return;
  }
  if (isPrimitive(value) && path) out.push({ path, value });
}

function isPrimitive(value: unknown): value is Primitive {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export function getFieldValue(
  source: Record<string, unknown>,
  path: string
): Primitive | undefined {
  return flattenSource(source).find((field) => field.path === path)?.value;
}
