/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IHttpFetchError } from '@kbn/core/public';

export const formatError = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'body' in error) {
    const body = (error as IHttpFetchError).body;
    if (body && typeof body === 'object' && 'message' in body) {
      return String((body as { message: unknown }).message);
    }
  }
  return error instanceof Error ? error.message : String(error);
};

export const getErrorStatus = (error: unknown): number | undefined => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as IHttpFetchError).response;
    return response?.status;
  }
  return undefined;
};

export const classifyError = (
  message: string
): 'disabled' | 'privilege' | 'unbound' | 'encryption' | 'uiam' | 'other' => {
  const lower = message.toLowerCase();
  if (lower.includes('encryption is not available') || lower.includes('encryptionkey')) {
    return 'encryption';
  }
  if (lower.includes('manage_security')) {
    return 'privilege';
  }
  if (lower.includes('no service account is bound')) {
    return 'unbound';
  }
  if (
    lower.includes('not enabled') ||
    lower.includes('feature is disabled') ||
    lower.includes('not available')
  ) {
    return 'disabled';
  }
  if (lower.includes('uiam') || lower.includes('organization id') || lower.includes('project')) {
    return 'uiam';
  }
  return 'other';
};
