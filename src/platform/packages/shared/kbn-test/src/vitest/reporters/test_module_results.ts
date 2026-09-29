/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TestCase, TestModule } from 'vitest/node';

export type CaseStatus = 'passed' | 'failed' | 'skipped';

export interface CaseResult {
  suites: string[];
  title: string;
  status: CaseStatus;
  durationMs: number;
  startTime: number;
  failureMessages: string[];
}

interface SerializedFailure {
  message?: string;
  stack?: string;
  diff?: string;
}

const formatError = ({ message, stack, diff }: SerializedFailure): string =>
  [stack ?? message ?? 'Unknown error', diff].filter(Boolean).join('\n\n');

const getSuiteTitles = (testCase: TestCase): string[] => {
  const titles: string[] = [];
  let parent = testCase.parent;
  while (parent.type === 'suite') {
    titles.unshift(parent.name);
    parent = parent.parent;
  }
  return titles;
};

const toCaseResult = (testCase: TestCase): CaseResult => {
  const result = testCase.result();
  const diagnostic = testCase.diagnostic();
  return {
    suites: getSuiteTitles(testCase),
    title: testCase.name,
    status: result.state === 'failed' ? 'failed' : result.state === 'passed' ? 'passed' : 'skipped',
    durationMs: diagnostic?.duration ?? 0,
    startTime: diagnostic?.startTime ?? Date.now(),
    failureMessages: result.state === 'failed' ? result.errors.map(formatError) : [],
  };
};

/** Flattens a finished test module into Jest-shaped per-test results. */
export const getModuleResults = (
  testModule: TestModule
): { cases: CaseResult[]; moduleErrors: string[] } => ({
  cases: Array.from(testModule.children.allTests(), toCaseResult),
  // Errors outside of any test, e.g. the file failed to import.
  moduleErrors: testModule.errors().map(formatError),
});
