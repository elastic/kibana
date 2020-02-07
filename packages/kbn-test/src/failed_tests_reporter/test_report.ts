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

import Fs from 'fs';
import { promisify } from 'util';

import xml2js from 'xml2js';

const readAsync = promisify(Fs.readFile);

export type TestReport =
  | {
      testsuites: {
        testsuite: TestSuite[];
      };
    }
  | {
      testsuite: TestSuite;
    };

export interface TestSuite {
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

export interface TestCase {
  $: {
    /* unique test name */
    name: string;
    /* somewhat human readable combination of test name and file */
    classname: string;
    /* number of seconds this test took */
    time: string;
    /* optional JSON encoded metadata */
    'metadata-json'?: string;
  };
  /* contents of system-out elements */
  'system-out'?: Array<string | { _: string }>;
  /* contents of failure elements */
  failure?: Array<string | { _: string }>;
  /* contents of skipped elements */
  skipped?: Array<string | { _: string }>;
}

export interface FailedTestCase extends TestCase {
  failure: Array<string | { _: string }>;
}

/**
 * Parse JUnit XML Files
 */
export async function parseTestReport(xml: string): Promise<TestReport> {
  return await xml2js.parseStringPromise(xml);
}

export async function readTestReport(testReportPath: string) {
  return await parseTestReport(await readAsync(testReportPath, 'utf8'));
}

export function* makeTestCaseIter(report: TestReport) {
  // Reporters may report multiple testsuites in a single file.
  const testSuites = 'testsuites' in report ? report.testsuites.testsuite : [report.testsuite];

  for (const testSuite of testSuites) {
    for (const testCase of testSuite.testcase) {
      yield testCase;
    }
  }
}

export function* makeFailedTestCaseIter(report: TestReport) {
  for (const testCase of makeTestCaseIter(report)) {
    if (!testCase.failure) {
      continue;
    }

    yield testCase as FailedTestCase;
  }
}
