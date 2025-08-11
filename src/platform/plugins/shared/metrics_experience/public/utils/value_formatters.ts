/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import numeral from '@elastic/numeral';

const getSmartNumberFormat = (value: number): string => {
  // Handle zero
  if (value === 0) return '0';

  const absValue = Math.abs(value);

  // For very small numbers (< 0.001), use scientific notation
  if (absValue < 0.001) {
    return value.toExponential(2);
  }

  // For small numbers (< 1), show up to 6 significant digits
  if (absValue < 1) {
    return value.toPrecision(6);
  }

  // For integers or numbers with no meaningful decimal part
  if (Number.isInteger(value) || absValue % 1 < 0.01) {
    return numeral(value).format('0,0');
  }

  // For numbers with 1-2 decimal places
  if (absValue < 100) {
    return numeral(value).format('0,0.00');
  }

  // For larger numbers, show 1 decimal place
  return numeral(value).format('0,0.0');
};

export const getValueFormatter = (unit?: string, metricName?: string) => {
  if (unit === 'byte' || unit === 'By') {
    return (value: number) => numeral(value).format('0.0b');
  } else if (unit === 'percent' || unit === '1') {
    return (value: number) => numeral(value).format('0.0%');
  } else if (metricName?.endsWith('pct')) {
    // Fallback for existing naming convention
    return (value: number) => numeral(value).format('0.0%');
  } else if (metricName?.endsWith('bytes')) {
    // Fallback for existing naming convention
    return (value: number) => numeral(value).format('0b');
  } else {
    return (value: number) => getSmartNumberFormat(value);
  }
};
