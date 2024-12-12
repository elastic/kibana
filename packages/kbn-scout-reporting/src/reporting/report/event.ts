/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildkiteMetadata, HostMetadata } from '../../datasources';

/**
 * Scout reporter event type
 */
export enum ScoutReportEventAction {
  RUN_BEGIN = 'run-begin',
  RUN_END = 'run-end',
  TEST_BEGIN = 'test-begin',
  TEST_END = 'test-end',
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
  type: 'jest' | 'ftr' | 'playwright';
}

/**
 * Scout test run info
 */
export interface ScoutTestRunInfo {
  id: string;
  status?: string;
  duration?: number;
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
  step?: {
    title: string;
    category?: string;
    duration?: number;
  };
}

/**
 * Scout file info
 */
export interface ScoutFileInfo {
  path: string;
  owner: string | string[];
}

/**
 * Document that records an event to be logged by the Scout reporter
 */
export interface ScoutReportEvent {
  '@timestamp'?: Date;
  buildkite?: BuildkiteMetadata;
  host?: HostMetadata;
  event: ScoutReportEventInfo;
  file?: ScoutFileInfo;
  labels?: { [id: string]: string };
  reporter: ScoutReporterInfo;
  test_run: ScoutTestRunInfo;
  suite?: ScoutSuiteInfo;
  test?: ScoutTestInfo;
}
