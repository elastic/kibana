/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface CallLogEntry {
  at: string;
  label: string;
  durationMs: number;
  ok: boolean;
  payload: unknown;
}

export const MAX_CALL_LOG = 20;

export const appendCallLog = (previous: CallLogEntry[], entry: CallLogEntry): CallLogEntry[] =>
  [entry, ...previous].slice(0, MAX_CALL_LOG);
