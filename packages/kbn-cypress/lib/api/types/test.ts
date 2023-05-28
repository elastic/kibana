/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum TestState {
  Failed = 'failed',
  Passed = 'passed',
  Pending = 'pending',
  Skipped = 'skipped',
}

export interface TestAttempt {
  state: TestState;
  error: CypressCommandLine.TestError | null;
  wallClockStartedAt: string | null;
  wallClockDuration: number | null;
  videoTimestamp: number | null;
}

interface TestConfig {
  retries:
    | {
        openMode: number;
        runMode: number;
      }
    | number;
}

export interface TestHook {
  clientId: string;
  type: 'before each';
  title: string[];
  body: string;
}

export interface Test {
  state: TestState;
  testId: string;
  displayError: string | null;
  title: string[];
  config?: null | TestConfig;
  hookIds: string[];
  body: string;
  attempts: TestAttempt[];
  hooks: TestHook[] | null;
}

export type SetTestsPayload = Pick<Test, 'body' | 'title' | 'config' | 'hookIds'> & {
  clientId: string;
};
