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

import { promisify } from 'util';
import Fs from 'fs';

import xml2js from 'xml2js';
import stripAnsi from 'strip-ansi';
import { ToolingLog } from '@kbn/dev-utils';

type TestReport =
  | {
      testsuites: {
        testsuite: TestSuite[];
      };
    }
  | {
      testsuite: TestSuite;
    };

interface TestSuite {
  $: {
    /* ISO8601 timetamp when test suite ran */
    timestamp: string;
    /* number of second this tests suite took */
    time: string;
    /* number of tests as a string */
    tests: string;
    /* number of failed tests as a string */
    failures: string;
    /* number of skipped tests as a string */
    skipped: string;
  };
  testcase: TestCase[];
}

interface TestCase {
  $: {
    /* unique test name */
    name: string;
    /* somewhat human readable combination of test name and file */
    classname: string;
    /* number of seconds this test took */
    time: string;
  };
  /* contents of system-out elements */
  'system-out'?: string[];
  /* contents of failure elements */
  failure?: Array<string | { _: string }>;
  /* contents of skipped elements */
  skipped?: string[];
}

export type TestFailure = TestCase['$'] & {
  failure: string;
};

const readAsync = promisify(Fs.readFile);

const indent = (text: string) =>
  `  ${text
    .split('\n')
    .map(l => `  ${l}`)
    .join('\n')}`;

const getFailureText = (testCase: TestCase) => {
  const [failureNode] = testCase.failure;

  if (failureNode && typeof failureNode === 'object' && typeof failureNode._ === 'string') {
    return stripAnsi(failureNode._);
  }

  return stripAnsi(String(failureNode));
};

const isLikelyIrrelevant = ({ name, failure }: TestFailure) => {
  if (
    failure.includes('NoSuchSessionError: This driver instance does not have a valid session ID')
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
};

export async function getFailures(log: ToolingLog, testReportPath: string) {
  const xml = await readAsync(testReportPath, 'utf8');

  // Parses junit XML files
  const report: TestReport = await xml2js.parseStringPromise(xml);

  // Grab the failures. Reporters may report multiple testsuites in a single file.
  const testSuites = 'testsuites' in report ? report.testsuites.testsuite : [report.testsuite];

  const failures: TestFailure[] = [];
  for (const testSuite of testSuites) {
    for (const testCase of testSuite.testcase) {
      if (!testCase.failure) {
        continue;
      }

      // unwrap xml weirdness
      const failureCase: TestFailure = {
        ...testCase.$,
        // Strip ANSI color characters
        failure: getFailureText(testCase),
      };

      if (isLikelyIrrelevant(failureCase)) {
        log.warning(
          `Ignoring likely irrelevant failure: ${failureCase.classname} - ${
            failureCase.name
          }\n${indent(failureCase.failure)}`
        );
        continue;
      }

      failures.push(failureCase);
    }
  }

  log.info(`Found ${failures.length} test failures`);

  return failures;
}
