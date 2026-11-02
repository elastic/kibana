/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Safely extract a number from scenario opts.
 */
export function getNumberOpt(
  opts: Record<string, unknown> | undefined,
  key: string,
  defaultValue: number
): number {
  const v = opts?.[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : defaultValue;
  }
  return defaultValue;
}

/**
 * Safely extract a boolean from scenario opts.
 */
export function getBooleanOpt(
  opts: Record<string, unknown> | undefined,
  key: string,
  defaultValue: boolean = false
): boolean {
  const v = opts?.[key];
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const normalized = v.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return defaultValue;
}

/**
 * Safely extract a string from scenario opts for use with parsers.
 */
export function getStringOpt(
  opts: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const v = opts?.[key];
  return typeof v === 'string' ? v : v != null ? String(v) : undefined;
}
