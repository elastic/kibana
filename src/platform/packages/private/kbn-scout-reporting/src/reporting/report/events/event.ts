/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TestCase } from '@playwright/test/reporter';
import type { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { BuildkiteMetadata, HostMetadata } from '../../../datasources';

/** A test's final classification, once no more retries can happen. Mirrors `TestCase.outcome()`. */
export type ScoutTestOutcome = ReturnType<TestCase['outcome']>;

/**
 * Scout reporter event type
 */
export enum ScoutReportEventAction {
  RUN_BEGIN = 'run-begin',
  RUN_END = 'run-end',
  TEST_BEGIN = 'test-begin',
  TEST_END = 'test-end',
  /** One per test, emitted at `onEnd` once every attempt (incl. retries) is known. */
  TEST_OUTCOME = 'test-outcome',
  TEST_STEP_BEGIN = 'test-step-begin',
  TEST_STEP_END = 'test-step-end',
  ERROR = 'error',
}

/**
 * Scout report event info
 */
export interface ScoutReportEventInfo {
  action: ScoutReportEventAction;
  outcome?: 'failure' | 'success' | 'unknown';
  error?: {
    message?: string;
    id?: string;
    code?: string;
    stack_trace?: string;
    type?: string;
  };
}

/**
 * Scout reporter info
 */
export interface ScoutReporterInfo {
  name: string;
  type: 'jest' | 'ftr' | 'playwright' | 'cypress';
}

/**
 * Scout file info
 */
export interface ScoutFileInfo {
  path: string;
  owner: string | string[];
  area: string | string[];
}

/**
 * Scout test run info
 */
export interface ScoutTestRunInfo {
  id: string;
  target: {
    type: string;
    mode: string;
  };
  fully_parallel?: boolean;
  config?: {
    file?: ScoutFileInfo;
    category?: ScoutTestRunConfigCategory;
    namespace?: string;
  };
  status?: string;
  duration?: number;
  tests?: {
    passes?: number;
    pending?: number;
    failures?: number;
    /** Passed, but only after at least one failed attempt. A subset of `passes`. */
    flaky?: number;
    total?: number;
  };
}

/**
 * Scout suite info
 */
export interface ScoutSuiteInfo {
  title: string;
  type: string;
}

/**
 * Scout test info
 */
export interface ScoutTestInfo {
  id: string;
  title: string;
  tags: string[];
  annotations?: Array<{
    type: string;
    description?: string;
  }>;
  expected_status?: string;
  duration?: number;
  status?: string;
  /** Zero-based attempt index; 0 is the first run, 1 the first retry. Present on `test-end`. */
  attempt?: number;
  /** Final classification, once the test can no longer be retried. Only on `test-outcome`. */
  outcome?: ScoutTestOutcome;
  /** Total number of attempts the test took. Only on `test-outcome`. */
  attempts?: number;
  console_errors?: string;
  step?: {
    title: string;
    category?: string;
    duration?: number;
  };
  file?: ScoutFileInfo;
}

/**
 * Document that records an event to be logged by the Scout reporter
 */
export interface ScoutReportEvent {
  '@timestamp'?: Date;
  buildkite?: BuildkiteMetadata;
  host?: HostMetadata;
  event: ScoutReportEventInfo;
  labels?: { [id: string]: string };
  reporter: ScoutReporterInfo;
  test_run: ScoutTestRunInfo;
  suite?: ScoutSuiteInfo;
  test?: ScoutTestInfo;
  process?: {
    uptime?: number;
  };
}
