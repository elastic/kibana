/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Safely extracts a string message from an unknown error.
 * Handles common HTTP/API error shapes (body.message, message) without type assertions.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error === null || error === undefined) {
    return fallback;
  }
  if (typeof error === 'object') {
    const err = error as { body?: { message?: string }; message?: string };
    const bodyMessage = err.body?.message;
    if (typeof bodyMessage === 'string' && bodyMessage.length > 0) {
      return bodyMessage;
    }
    const message = err.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  return fallback;
}
