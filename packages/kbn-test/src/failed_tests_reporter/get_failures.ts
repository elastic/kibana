/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
