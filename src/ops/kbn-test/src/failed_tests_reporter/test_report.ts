/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  testcase?: TestCase[];
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
  failure: Array<string | { $: { message?: string }; _: string }>;
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
    for (const testCase of testSuite.testcase || []) {
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
