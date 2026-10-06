/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SampleDataSet } from '@kbn/home-sample-data-types';
/**
 * Options for polling sample data status after installation or removal.
 */
export interface PollOptions {
  /**
   * Maximum number of retry attempts (default: 10)
   */
  maxAttempts?: number;
  /**
   * Initial delay before first check in milliseconds
   */
  initialDelayMs?: number;
  /**
   * Minimum time between poll attempts in milliseconds
   */
  minTimeout?: number;
  /**
   * Factor for exponential backoff (default: 1.5)
   */
  factor?: number;
  /**
   * Callback for logging failed attempts
   */
  onFailedAttempt?: (error: Error, attemptNumber: number) => void;
}
/**
 * Poll the sample data list endpoint until the dataset shows as installed.
 */
export declare function pollForInstallation(
  id: string,
  fetchSampleDataSets: () => Promise<SampleDataSet[]>,
  options?: PollOptions
): Promise<void>;
/**
 * Poll the sample data list endpoint until the dataset shows as uninstalled.
 */
export declare function pollForRemoval(
  id: string,
  fetchSampleDataSets: () => Promise<SampleDataSet[]>,
  options?: PollOptions
): Promise<void>;
