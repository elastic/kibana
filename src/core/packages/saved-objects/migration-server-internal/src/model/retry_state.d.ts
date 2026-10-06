/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationLog } from '../types';
export interface RetryableState {
  controlState: string;
  retryCount: number;
  skipRetryReset: boolean;
  retryDelay: number;
  logs: MigrationLog[];
}
export declare const delayRetryState: <S extends RetryableState>(
  state: S,
  errorMessage: string,
  /** How many times to retry a step that fails */
  maxRetryAttempts: number
) => S;
export declare const resetRetryState: <S extends RetryableState>(state: S) => S;
