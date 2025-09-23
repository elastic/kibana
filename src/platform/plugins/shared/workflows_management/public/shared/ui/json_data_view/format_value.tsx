/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (Array.isArray(value)) {
    return `<span class="ffArray__highlight">[</span>${value
      .map(formatValue)
      .join(
        `<span class="ffArray__highlight">, </span>`
      )}<span class="ffArray__highlight">]</span>`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
