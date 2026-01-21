/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toHavePayload } from './to_have_payload';
import { toHaveHeaders } from './to_have_headers';
import { toHaveStatusCode } from './to_have_status_code';
import { toHaveStatusText } from './to_have_status_text';
import type { ToHavePayloadOptions } from './to_have_payload';
import type { ToHaveStatusCodeOptions } from './to_have_status_code';

/**
 * Union type for objects that can have dynamic matchers
 */
export type DynamicMatchersInput =
  | { status: unknown }
  | { statusCode: unknown }
  | { statusText: unknown }
  | { statusMessage: unknown }
  | { headers: unknown }
  | { data: unknown }
  | { body: unknown };

/**
 * Create dynamic matchers based on object keys.
 * Supports both `apiClient` and `kbnClient` response interfaces.
 */
export function createDynamicMatchers(
  obj: DynamicMatchersInput
): Record<string, unknown> & { not: Record<string, unknown> } {
  const matchers: Record<string, unknown> = {};
  const not: Record<string, unknown> = {};

  if ('status' in obj || 'statusCode' in obj) {
    matchers.toHaveStatusCode = (code: number | ToHaveStatusCodeOptions) =>
      toHaveStatusCode(obj, code);
    not.toHaveStatusCode = (code: number | ToHaveStatusCodeOptions) =>
      toHaveStatusCode(obj, code, true);
  }

  if ('statusText' in obj || 'statusMessage' in obj) {
    matchers.toHaveStatusText = (text: string) => toHaveStatusText(obj, text);
    not.toHaveStatusText = (text: string) => toHaveStatusText(obj, text, true);
  }

  if ('headers' in obj) {
    matchers.toHaveHeaders = (headers: Record<string, string>) => toHaveHeaders(obj, headers);
    not.toHaveHeaders = (headers: Record<string, string>) => toHaveHeaders(obj, headers, true);
  }

  if ('data' in obj || 'body' in obj) {
    matchers.toHavePayload = (expected?: unknown, options?: ToHavePayloadOptions) =>
      toHavePayload(obj, expected, options);
    not.toHavePayload = (expected?: unknown, options?: ToHavePayloadOptions) =>
      toHavePayload(obj, expected, options, true);
  }

  return { ...matchers, not };
}
