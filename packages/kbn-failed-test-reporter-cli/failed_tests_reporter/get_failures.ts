/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import stripAnsi from 'strip-ansi';

import type { FailedTestCase, TestReport } from './test_report';
import { makeFailedTestCaseWithSuiteIter } from './test_report';

export type JUnitTestType = 'ftr' | 'jest' | 'cypress';

export type TestFailure = FailedTestCase['$'] & {
  failure: string;
  likelyIrrelevant: boolean;
  'system-out'?: string;
  githubIssue?: string;
  failureCount?: number;
  commandLine?: string;
  owners?: string;
  testType?: JUnitTestType;
  location?: string;
};

const getText = (node?: Array<string | { _: string }>) => {
  if (!node) {
    return '';
  }

  const [nodeWrapped] = node;

  if (nodeWrapped && typeof nodeWrapped === 'object' && typeof nodeWrapped._ === 'string') {
    return stripAnsi(nodeWrapped._);
  }

  return stripAnsi(String(nodeWrapped));
};

/** Decode the repository-relative file path stored in an FTR classname. */
export function getLocationFromClassname(classname: string): string {
  const idx = classname.indexOf('.');
  if (idx === -1) {
    return '';
  }
  return classname.slice(idx + 1).replace(/·/g, '.');
}

/**
 * Best-effort detection of the test framework that produced a failure so it can
 * be surfaced in the issue metadata. Scout failures are handled separately.
 */
function getTestType(rootName: string | undefined, classname: string): JUnitTestType | undefined {
  if (/cypress/i.test(classname.split('.')[0])) {
    return 'cypress';
  }
  if (rootName === 'jest' || rootName === 'ftr') {
    return rootName;
  }
  return undefined;
}

function getRootSuiteName(report: TestReport): string | undefined {
  return 'testsuites' in report ? report.testsuites?.$?.name : undefined;
}

const isLikelyIrrelevant = (name: string, failure: string) => {
  if (
    failure.includes('NoSuchSessionError: This driver instance does not have a valid session ID') ||
    failure.includes(
      'NoSuchSessionError: Tried to run command without establishing a connection'
    ) ||
    failure.includes('NoSuchSessionError: invalid session id')
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

  if (failure.includes('Unable to read snapshot manifest: Internal Server Error')) {
    return true;
  }

  return false;
};

export function getFailures(report: TestReport) {
  const failures: TestFailure[] = [];

  const commandLine = getCommandLineFromReport(report);
  const rootName = getRootSuiteName(report);

  for (const { testCase, testSuite } of makeFailedTestCaseWithSuiteIter(report)) {
    const failure = getText(testCase.failure);
    const likelyIrrelevant = isLikelyIrrelevant(testCase.$.name, failure);
    const owners = testCase.$.owners;
    const testType = getTestType(rootName, testCase.$.classname);
    const location =
      testType === 'jest' ? testSuite.$.name : getLocationFromClassname(testCase.$.classname);

    const failureObj = {
      // unwrap xml weirdness
      ...testCase.$,
      // Strip ANSI color characters
      failure,
      likelyIrrelevant,
      'system-out': getText(testCase['system-out']),
      commandLine,
      owners,
      testType,
      location,
    };

    // cleaning up duplicates
    delete failureObj['command-line'];

    failures.push(failureObj);
  }

  return failures;
}

function getCommandLineFromReport(report: TestReport) {
  if ('testsuites' in report) {
    return report.testsuites?.testsuite?.[0]?.$['command-line'] || '';
  } else {
    return report.testsuite?.$['command-line'] || '';
  }
}
