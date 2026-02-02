/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseStringToBoolean } from './logs_scenario_opts_parser';

/**
 * Supported modes for HTTP access logs generation.
 * - normal: Standard traffic patterns with normal error rates
 * - attack: Simulates attack traffic (SQL injection, XSS, etc.)
 * - error: Higher error rates (500 errors, timeouts)
 * - heavy: Large request/response bodies
 * - comprehensive: Mix of all patterns
 * - mixed: All traffic types with realistic distribution
 */
export type HttpAccessLogsMode =
  | 'normal'
  | 'attack'
  | 'error'
  | 'heavy'
  | 'comprehensive'
  | 'mixed';

/**
 * Options for HTTP access logs scenario.
 */
export interface HttpAccessLogsOpts {
  /** Scale multiplier for all generators (default: 1) */
  scale: number;
  /** Generation mode (default: 'normal') */
  mode: HttpAccessLogsMode;
  /** Error rate for normal mode (0.0 to 1.0, default: 0.05 = 5%) */
  errorRate: number;
  /** Attack volume multiplier (default: 50) */
  attackVolume: number;
  /** Whether to use LogsDB format (default: false) */
  isLogsDb: boolean;
}

/**
 * Default options for HTTP access logs.
 */
const DEFAULT_OPTS: HttpAccessLogsOpts = {
  scale: 1,
  mode: 'normal',
  errorRate: 0.05,
  attackVolume: 50,
  isLogsDb: false,
};

/**
 * Parse a string to a number with validation.
 */
function parseNumber(
  value: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (!value) return defaultValue;

  const parsed = parseFloat(value);

  if (isNaN(parsed)) {
    return defaultValue;
  }

  if (min !== undefined && parsed < min) {
    return min;
  }

  if (max !== undefined && parsed > max) {
    return max;
  }

  return parsed;
}

/**
 * Validate and parse mode string.
 */
function parseMode(value: string | undefined): HttpAccessLogsMode {
  if (!value) return DEFAULT_OPTS.mode;

  const normalized = value.trim().toLowerCase();
  const validModes: HttpAccessLogsMode[] = [
    'normal',
    'attack',
    'error',
    'heavy',
    'comprehensive',
    'mixed',
  ];

  if (validModes.includes(normalized as HttpAccessLogsMode)) {
    return normalized as HttpAccessLogsMode;
  }

  // Default to 'normal' for invalid modes
  return DEFAULT_OPTS.mode;
}

/**
 * Parse HTTP access logs scenario options from CLI arguments.
 *
 * @param scenarioOpts - Raw options from CLI
 * @returns Validated and parsed options
 *
 * @example
 * ```typescript
 * const opts = parseHttpAccessLogsOpts({
 *   scale: '100',
 *   mode: 'attack',
 *   errorRate: '0.1',
 *   logsdb: 'true'
 * });
 * ```
 */
export function parseHttpAccessLogsOpts(
  scenarioOpts: Record<string, any> | undefined
): HttpAccessLogsOpts {
  const scale = parseNumber(scenarioOpts?.scale, DEFAULT_OPTS.scale, 1);
  const mode = parseMode(scenarioOpts?.mode);
  const errorRate = parseNumber(scenarioOpts?.errorRate, DEFAULT_OPTS.errorRate, 0, 1);
  const attackVolume = parseNumber(scenarioOpts?.attackVolume, DEFAULT_OPTS.attackVolume, 1);
  const isLogsDb = parseStringToBoolean(scenarioOpts?.logsdb, DEFAULT_OPTS.isLogsDb);

  return {
    scale,
    mode,
    errorRate,
    attackVolume,
    isLogsDb,
  };
}

/**
 * Get a descriptive message for the current options configuration.
 */
export function getOptsDescription(opts: HttpAccessLogsOpts): string {
  const parts = [
    `Mode: ${opts.mode}`,
    `Scale: ${opts.scale}x`,
    `Error rate: ${(opts.errorRate * 100).toFixed(1)}%`,
  ];

  if (opts.mode === 'attack') {
    parts.push(`Attack volume: ${opts.attackVolume}x`);
  }

  if (opts.isLogsDb) {
    parts.push('LogsDB: enabled');
  }

  return parts.join(', ');
}
