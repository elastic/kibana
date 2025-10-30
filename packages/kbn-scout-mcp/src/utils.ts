/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolResult } from './types';

/**
 * Create a success result
 */
export function success(data?: any, message?: string): ToolResult {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Create an error result
 */
export function error(errorMessage: string, data?: any): ToolResult {
  return {
    success: false,
    error: errorMessage,
    data,
  };
}

/**
 * Safely execute an async function and return a ToolResult
 */
export async function executeSafely<T>(
  fn: () => Promise<T>,
  errorPrefix: string = 'Operation failed'
): Promise<ToolResult> {
  try {
    const result = await fn();
    return success(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return error(`${errorPrefix}: ${message}`);
  }
}

/**
 * Validate required parameters
 */
export function validateParams(
  params: Record<string, any>,
  required: string[]
): string | null {
  for (const key of required) {
    if (params[key] === undefined || params[key] === null) {
      return `Missing required parameter: ${key}`;
    }
  }
  return null;
}

/**
 * Format screenshot filename with timestamp
 */
export function formatScreenshotFilename(filename?: string, extension: string = 'png'): string {
  if (filename) {
    return filename;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `scout-screenshot-${timestamp}.${extension}`;
}
