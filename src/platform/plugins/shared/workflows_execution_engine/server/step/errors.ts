/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionError } from '@kbn/workflows/server';

export const DEFAULT_MAX_STEP_SIZE = '10mb';

const BYTE_UNITS: Array<{ unit: string; size: number }> = [
  { unit: 'GB', size: 1024 * 1024 * 1024 },
  { unit: 'MB', size: 1024 * 1024 },
  { unit: 'KB', size: 1024 },
  { unit: 'B', size: 1 },
];

/**
 * Formats a byte count into a human-readable string (e.g., "15.2 MB").
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  for (const { unit, size } of BYTE_UNITS) {
    if (bytes >= size) {
      const value = bytes / size;
      return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`;
    }
  }
  return `${bytes} B`;
}

const BYTE_SIZE_PATTERN = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i;

const UNIT_MULTIPLIERS: Record<string, number> = {
  b: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
};

/**
 * Parses a byte size string (e.g., "10mb", "15MB", "1gb", "500kb") into bytes.
 * Also accepts raw numbers (treated as bytes).
 */
export function parseByteSize(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }

  const match = value.trim().match(BYTE_SIZE_PATTERN);
  if (!match) {
    throw new Error(
      `Invalid byte size string: "${value}". Expected format: <number><unit> (e.g., "10mb", "1gb", "500kb").`
    );
  }

  const [, numStr, unit] = match;
  const num = parseFloat(numStr);
  const multiplier = UNIT_MULTIPLIERS[unit.toLowerCase()];
  return Math.floor(num * multiplier);
}

/**
 * Safely measures the serialized size of an output value.
 * Returns the byte count on success, or -1 if the value is not serializable
 * (e.g., streams, circular references, functions).
 */
export function safeOutputSize(output: unknown): number {
  try {
    const json = JSON.stringify(output);
    return Buffer.byteLength(json, 'utf8');
  } catch {
    // Circular references, BigInt, or other non-serializable values
    return -1;
  }
}

/**
 * Error thrown when a step's response or output exceeds the configured size limit.
 * Used by both Layer 1 (pre-emptive I/O enforcement) and Layer 2 (base class output guard).
 */
export class ResponseSizeLimitError extends ExecutionError {
  constructor(limitBytes: number, stepName: string) {
    super({
      type: 'StepSizeLimitExceeded',
      message:
        `Step "${stepName}" output exceeded the ` +
        `${formatBytes(limitBytes)} size limit. ` +
        `Configure 'max-step-size' at the step or workflow level to increase the limit, ` +
        `or reduce the response size (e.g., filter fields, limit results).`,
      details: {
        limitBytes,
      },
    });
  }
}
