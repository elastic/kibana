/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CiStatsMetadata } from '@kbn/ci-stats-core';

export type CiStatsTestResult = 'fail' | 'pass' | 'skip';
export type CiStatsTestType =
  | 'after all hook'
  | 'after each hook'
  | 'before all hook'
  | 'before each hook'
  | 'test';

export interface CiStatsTestRun {
  /**
   * ISO-8601 formatted datetime representing when the tests started running
   */
  startTime: string;
  /**
   * Duration of the tests in milliseconds
   */
  durationMs: number;
  /**
   * A sequence number, this is used to order the tests in a specific test run
   */
  seq: number;
  /**
   * The type of this "test run", usually this is just "test" but when reporting issues in hooks it can be set to the type of hook
   */
  type: CiStatsTestType;
  /**
   * "fail", "pass" or "skip", the result of the tests
   */
  result: CiStatsTestResult;
  /**
   * The list of suite names containing this test, the first being the outermost suite
   */
  suites: string[];
  /**
   * The name of this specific test run
   */
  name: string;
  /**
   * Relative path from the root of the repo contianing this test
   */
  file: string;
  /**
   * Error message if the test failed
   */
  error?: string;
  /**
   * Debug output/stdout produced by the test
   */
  stdout?: string;
  /**
   * Screenshots captured during the test run
   */
  screenshots?: Array<{
    name: string;
    base64Png: string;
  }>;
}

export interface CiStatsTestGroupInfo {
  /**
   * ISO-8601 formatted datetime representing when the group of tests started running
   */
  startTime: string;
  /**
   * The number of miliseconds that the tests ran for
   */
  durationMs: number;
  /**
   * The type of tests run in this group, any value is valid but test groups are groupped by type in the UI so use something consistent
   */
  type: string;
  /**
   * The name of this specific group (within the "type")
   */
  name: string;
  /**
   * Arbitrary metadata associated with this group. We currently look for a ciGroup metadata property for highlighting that when appropriate
   */
  meta: CiStatsMetadata;
}
