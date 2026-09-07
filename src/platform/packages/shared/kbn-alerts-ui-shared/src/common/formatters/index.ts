/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AlertFormatterFormatters } from '../types/alert_formatter_types';

const NOT_AVAILABLE_LABEL = 'N/A';

/**
 * Checks if a value is a finite number
 */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value);
}

/**
 * Format a number as a decimal string with up to 1 decimal place
 */
function asDecimal(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

/**
 * Format a number as an integer string
 */
function asInteger(value: number): string {
  return Math.round(value).toLocaleString();
}

/**
 * Format a duration value (in microseconds) to a human-readable string
 *
 * @param value - Duration in microseconds (note: microseconds, not milliseconds)
 * @param options - Formatting options
 * @returns Formatted duration string
 */
export function asDuration(value: number | null, options?: { extended?: boolean }): string {
  if (!isFiniteNumber(value)) {
    return NOT_AVAILABLE_LABEL;
  }

  const extended = options?.extended ?? false;

  // Convert microseconds to milliseconds for calculations
  const ms = value / 1000;

  // Determine appropriate unit based on magnitude
  if (ms >= 36000000) {
    // >= 10 hours
    const hours = ms / 3600000;
    const formatted = asDecimal(hours);
    return extended ? `${formatted} hours` : `${formatted} h`;
  }
  if (ms >= 600000) {
    // >= 10 minutes
    const minutes = ms / 60000;
    const formatted = asDecimal(minutes);
    return extended ? `${formatted} minutes` : `${formatted} min`;
  }
  if (ms >= 1000) {
    // >= 1 second
    const seconds = ms / 1000;
    const formatted = asDecimal(seconds);
    return extended ? `${formatted} seconds` : `${formatted} s`;
  }
  if (ms >= 1) {
    // >= 1 millisecond
    const formatted = asDecimal(ms);
    return extended ? `${formatted} milliseconds` : `${formatted} ms`;
  }
  // microseconds
  const formatted = asInteger(value);
  return extended ? `${formatted} microseconds` : `${formatted} μs`;
}

/**
 * Format a ratio as a percentage string
 *
 * @param numerator - The numerator value
 * @param denominator - The denominator value
 * @param floor - Optional floor value to display when denominator is 0 or numerator is not a number
 * @returns Formatted percentage string
 */
export function asPercent(
  numerator: number,
  denominator: number,
  floor: string = NOT_AVAILABLE_LABEL
): string {
  if (!denominator || !isFiniteNumber(numerator)) {
    return floor;
  }

  const decimal = numerator / denominator;
  const percent = decimal * 100;

  // 33.2% => 33%
  // 3.32% => 3.3%
  // 0% => 0%
  if (Math.abs(percent) >= 10 || decimal === 0) {
    return `${Math.round(percent)}%`;
  }

  return `${percent.toFixed(1)}%`;
}

/**
 * Default alert formatter utilities
 *
 * Provides standard formatting functions for use in alert formatters.
 */
export const defaultAlertFormatterFormatters: AlertFormatterFormatters = {
  asDuration,
  asPercent,
};
