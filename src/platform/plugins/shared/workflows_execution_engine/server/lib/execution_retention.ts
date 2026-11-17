/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ExecutionRetention {
  source: 'plain_index' | 'data_stream';
  /** How long executions are kept, or null when nothing expires them (plain index storage). */
  retentionMs: number | null;
}

const UNIT_MS = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1_000 } as const;

/** Parses a validated storage duration such as "90d" or "12h" into milliseconds. */
export const parseRetentionToMs = (value: string): number => {
  const match = /^([1-9]\d*)(d|h|m|s)$/.exec(value);
  if (!match) {
    throw new Error(`Invalid retention duration "${value}"`);
  }
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
};

/**
 * Plain index storage never expires executions; only the data stream lifecycle applies
 * `dataRetention`.
 */
export const getExecutionRetention = (storage: {
  source: 'plain_index' | 'data_stream';
  dataRetention: string;
}): ExecutionRetention => ({
  source: storage.source,
  retentionMs: storage.source === 'data_stream' ? parseRetentionToMs(storage.dataRetention) : null,
});
