/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function formatMs(ms?: number): string {
  if (ms === undefined) {
    return 'N/A';
  }

  const seconds = ms / 1000;
  if (seconds < 0.5) {
    return `${seconds.toFixed(2)}s`;
  } else if (seconds < 10) {
    return `${seconds.toFixed(1)}s`;
  } else {
    return `${Math.round(seconds)}s`;
  }
}
