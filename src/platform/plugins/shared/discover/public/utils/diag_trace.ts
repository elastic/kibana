/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 */

import { addLog } from './add_log';

let globalSeq = 0;
const markerCounts: Record<string, number> = {};

export const diag = (marker: string, payload?: unknown) => {
  globalSeq += 1;
  const count = (markerCounts[marker] = (markerCounts[marker] ?? 0) + 1);

  if (count <= 25 || count % 100 === 0) {
    const now = typeof performance !== 'undefined' ? Math.round(performance.now()) : -1;
    addLog(`DIAG ${marker} #${count} seq=${globalSeq} t=${now}ms`, payload);
  }
};

const guardState: Record<string, { count: number; last: number }> = {};

export const diagGuard = (label: string, limit: number, windowMs = 2000) => {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const prev = guardState[label];

  if (!prev || now - prev.last > windowMs) {
    guardState[label] = { count: 1, last: now };
    return;
  }

  prev.count += 1;
  prev.last = now;

  if (prev.count >= limit) {
    throw new Error(
      `[Discover] DIAG-GUARD tripped: ${label} reached ${prev.count} calls within ${windowMs}ms`
    );
  }
};
