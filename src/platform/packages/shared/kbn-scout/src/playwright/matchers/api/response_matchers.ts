/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toHaveHeaders } from './to_have_headers';
import { toHaveStatusCode } from './to_have_status_code';
import { toHaveStatusText } from './to_have_status_text';
import type { ToHaveStatusCodeOptions } from './to_have_status_code';
import type { ResponseMatchers } from './types';

/**
 * Create response matchers for API response assertions.
 * Matchers validate that the object has required properties before asserting.
 */
export function createResponseMatchers(obj: unknown): ResponseMatchers {
  return {
    toHaveStatusCode: (code: number | ToHaveStatusCodeOptions) => toHaveStatusCode(obj, code),
    toHaveStatusText: (text: string) => toHaveStatusText(obj, text),
    toHaveHeaders: (headers: Record<string, string>) => toHaveHeaders(obj, headers),
  };
}
