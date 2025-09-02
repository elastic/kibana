/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Minimal JSON shape written by our reporter and read by our runner

export interface SlimAssertionResult {
  status: 'passed' | 'failed' | 'skipped' | 'pending' | 'todo' | string;
  title?: string;
  fullName?: string;
  failureMessages?: string[];
}

export interface SlimTestResult {
  testFilePath: string;
  numFailingTests: number;
  failureMessage?: string;
  testResults: SlimAssertionResult[];
}

export interface SlimAggregatedResult {
  numFailedTests: number;
  testResults: SlimTestResult[];
}
