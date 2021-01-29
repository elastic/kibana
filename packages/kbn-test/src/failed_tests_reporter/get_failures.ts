/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import stripAnsi from 'strip-ansi';

import { FailedTestCase, TestReport, makeFailedTestCaseIter } from './test_report';

export type TestFailure = FailedTestCase['$'] & {
  failure: string;
  likelyIrrelevant: boolean;
};

const getFailureText = (failure: FailedTestCase['failure']) => {
  const [failureNode] = failure;

  if (failureNode && typeof failureNode === 'object' && typeof failureNode._ === 'string') {
    return stripAnsi(failureNode._);
  }

  return stripAnsi(String(failureNode));
};

const isLikelyIrrelevant = (name: string, failure: string) => {
  if (
    failure.includes('NoSuchSessionError: This driver instance does not have a valid session ID') ||
    failure.includes('NoSuchSessionError: Tried to run command without establishing a connection')
  ) {
    return true;
  }

  if (failure.includes('Error: No Living connections')) {
    return true;
  }

  if (
    name.includes('"after all" hook') &&
    failure.includes(`Cannot read property 'shutdown' of undefined`)
  ) {
    return true;
  }

  if (
    failure.includes('Unable to read artifact info') &&
    failure.includes('Service Temporarily Unavailable')
  ) {
    return true;
  }

  if (failure.includes('Unable to fetch Kibana status API response from Kibana')) {
    return true;
  }

  return false;
};

export function getFailures(report: TestReport) {
  const failures: TestFailure[] = [];

  for (const testCase of makeFailedTestCaseIter(report)) {
    const failure = getFailureText(testCase.failure);
    const likelyIrrelevant = isLikelyIrrelevant(testCase.$.name, failure);

    failures.push({
      // unwrap xml weirdness
      ...testCase.$,
      // Strip ANSI color characters
      failure,
      likelyIrrelevant,
    });
  }

  return failures;
}
