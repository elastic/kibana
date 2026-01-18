/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toHaveData } from './to_have_data';
import { toHaveHeaders } from './to_have_headers';
import { toHaveStatusCode } from './to_have_status_code';
import { toHaveStatusText } from './to_have_status_text';
import type { ToHaveDataOptions } from './to_have_data';

/**
 * Union type for objects that can have dynamic matchers
 */
export type DynamicMatchersInput =
  | { status: unknown }
  | { statusText: unknown }
  | { headers: unknown }
  | { data: unknown };

/**
 * Create dynamic matchers based on object keys
 */
export function createDynamicMatchers(
  obj: DynamicMatchersInput
): Record<string, unknown> & { not: Record<string, unknown> } {
  const matchers: Record<string, unknown> = {};
  const not: Record<string, unknown> = {};

  if ('status' in obj) {
    matchers.toHaveStatusCode = (code: number) => toHaveStatusCode(obj, code);
    not.toHaveStatusCode = (code: number) => toHaveStatusCode(obj, code, true);
  }
  if ('statusText' in obj) {
    matchers.toHaveStatusText = (text: string) => toHaveStatusText(obj, text);
    not.toHaveStatusText = (text: string) => toHaveStatusText(obj, text, true);
  }
  if ('headers' in obj) {
    matchers.toHaveHeaders = (headers: Record<string, string>) => toHaveHeaders(obj, headers);
    not.toHaveHeaders = (headers: Record<string, string>) => toHaveHeaders(obj, headers, true);
  }
  if ('data' in obj) {
    matchers.toHaveData = (expected?: unknown, options?: ToHaveDataOptions) =>
      toHaveData(obj, expected, options);
    not.toHaveData = (expected?: unknown, options?: ToHaveDataOptions) =>
      toHaveData(obj, expected, options, true);
  }

  return { ...matchers, not };
}
