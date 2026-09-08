/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Round fractional pixel values in a CSS string to whole numbers.
 * e.g. "12.345px" → "12px", "10px 20.7px" → "10px 21px"
 *
 * @param value - The CSS string containing pixel values.
 * @returns The string with rounded pixel values.
 */
export const roundPxValue = (value: string): string =>
  value.replace(/(\d+\.\d+)px/g, (_m, n) => `${Math.round(parseFloat(n))}px`);

/**
 * Parse a CSS pixel value to a rounded integer, returning 0 for
 * non-numeric values (e.g. "auto", "normal", "inherit").
 *
 * @param value - The CSS pixel value string.
 * @returns The rounded integer, or 0 for non-numeric values.
 */
export const parsePx = (value: string): number => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
};
