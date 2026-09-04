/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client as ESClient } from '@elastic/elasticsearch';
import { SCOUT_TEST_EVENTS_INDEX_PATTERN } from '@kbn/scout-info';
import type { FailureSample, SpecObservation, TestObservation } from '../report/schema';
import { classifyMechanism, normalizeErrorMessage } from '../mechanism/classify';

/**
 * Escapes a value for inclusion in an ES|QL string literal. Values originate from Elasticsearch
 * rather than from users, but they still reach the query as text, so they are quoted rather
 * than trusted.
 */
export const quoteEsqlString = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const inList = (values: string[]): string => values.map(quoteEsqlString).join(', ');

export interface FlakinessQueryScope {
  lookbackDays: number;
  pipelineSlugs: string[];
  branches: string[];
}

/**
 * File-level rates for every spec that failed at least once in the window.
 *
 * This is the only unscoped scan and therefore the expensive one (~33s over 7 days). It stays
 * affordable because it groups by `test.file.path` rather than `test.id`: measured over 7 days,
 * that is ~88K groups instead of ~943K.
 */
export const fetchSpecObservations = async (
  es: ESClient,
  scope: FlakinessQueryScope
): Promise<SpecObservation[]> => {
  const query = [
    `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
    `WHERE @timestamp >= NOW() - ${scope.lookbackDays} day` +
      ` AND event.action == "test-end"` +
      ` AND test.status IN ("passed", "failed")` +
      ` AND buildkite.pipeline.slug IN (${inList(scope.pipelineSlugs)})` +
      ` AND buildkite.branch IN (${inList(scope.branches)})`,
    'STATS runs = COUNT(*),' +
      ' fails = SUM(CASE(test.status == "failed", 1, 0)),' +
      ' builds = COUNT_DISTINCT(buildkite.build.number),' +
      ' failed_builds = COUNT_DISTINCT(CASE(test.status == "failed", buildkite.build.number, NULL)),' +
      ' branches = COUNT_DISTINCT(buildkite.branch),' +
      ' tests = COUNT_DISTINCT(test.id),' +
      ' last_seen = MAX(@timestamp)' +
      ' BY test.file.path, reporter.type, buildkite.pipeline.slug',
    'WHERE fails > 0',
    'RENAME test.file.path AS file_path, reporter.type AS reporter_type,' +
      ' buildkite.pipeline.slug AS pipeline_slug',
    'SORT failed_builds DESC',
    'LIMIT 2000',
  ].join(' | ');

  const { records } = await es.helpers.esql({ query }).toRecords<{
    file_path: string;
    reporter_type: string;
    pipeline_slug: string;
    runs: number;
    fails: number;
    builds: number;
    failed_builds: number;
    branches: number;
    tests: number;
    last_seen: string;
  }>();

  return records.map((record) => ({
    filePath: record.file_path,
    reporterType: record.reporter_type,
    pipelineSlug: record.pipeline_slug,
    runs: record.runs,
    fails: record.fails,
    builds: record.builds,
    failedBuilds: record.failed_builds,
    branches: record.branches,
    tests: record.tests,
    lastSeen: new Date(record.last_seen),
  }));
};

/**
 * Per-test rates, scoped to specific spec files.
 *
 * Scoping is not an optimisation but a requirement: the same aggregation without a file filter
 * did not return within five minutes, while filtered to a handful of specs it returns in under
 * a second.
 */
export const fetchTestObservations = async (
  es: ESClient,
  scope: FlakinessQueryScope & { filePaths: string[] }
): Promise<TestObservation[]> => {
  if (scope.filePaths.length === 0) {
    return [];
  }

  const query = [
    `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
    `WHERE @timestamp >= NOW() - ${scope.lookbackDays} day` +
      ` AND event.action == "test-end"` +
      ` AND test.status IN ("passed", "failed")` +
      ` AND buildkite.pipeline.slug IN (${inList(scope.pipelineSlugs)})` +
      ` AND buildkite.branch IN (${inList(scope.branches)})` +
      ` AND test.file.path IN (${inList(scope.filePaths)})`,
    'STATS runs = COUNT(*),' +
      ' fails = SUM(CASE(test.status == "failed", 1, 0)),' +
      ' builds = COUNT_DISTINCT(buildkite.build.number),' +
      ' failed_builds = COUNT_DISTINCT(CASE(test.status == "failed", buildkite.build.number, NULL)),' +
      ' last_seen = MAX(@timestamp)' +
      ' BY test.id, test.title.keyword, test.file.path, reporter.type, buildkite.branch',
    'WHERE fails > 0',
    'RENAME test.id AS test_id, test.title.keyword AS title, test.file.path AS file_path,' +
      ' reporter.type AS reporter_type, buildkite.branch AS branch',
    'SORT failed_builds DESC',
    'LIMIT 2000',
  ].join(' | ');

  const { records } = await es.helpers.esql({ query }).toRecords<{
    test_id: string;
    title: string;
    file_path: string;
    reporter_type: string;
    branch: string;
    runs: number;
    fails: number;
    builds: number;
    failed_builds: number;
    last_seen: string;
  }>();

  return records.map((record) => ({
    testId: record.test_id,
    title: record.title ?? '(unknown)',
    filePath: record.file_path,
    reporterType: record.reporter_type,
    branch: record.branch,
    runs: record.runs,
    fails: record.fails,
    builds: record.builds,
    failedBuilds: record.failed_builds,
    lastSeen: new Date(record.last_seen),
  }));
};

/**
 * Individual failures for the given specs, classified by mechanism. Error messages are mapped
 * as `text` and so cannot be aggregated in Elasticsearch; fingerprinting happens here instead.
 */
export const fetchFailureSamples = async (
  es: ESClient,
  scope: FlakinessQueryScope & { filePaths: string[]; limit: number }
): Promise<FailureSample[]> => {
  if (scope.filePaths.length === 0) {
    return [];
  }

  const query = [
    `FROM ${SCOUT_TEST_EVENTS_INDEX_PATTERN}`,
    `WHERE @timestamp >= NOW() - ${scope.lookbackDays} day` +
      ` AND event.action == "test-end"` +
      ` AND test.status == "failed"` +
      ` AND buildkite.pipeline.slug IN (${inList(scope.pipelineSlugs)})` +
      ` AND buildkite.branch IN (${inList(scope.branches)})` +
      ` AND test.file.path IN (${inList(scope.filePaths)})`,
    'KEEP @timestamp, test.title.keyword, test.file.path, buildkite.build.number,' +
      ' event.error.message',
    'RENAME test.title.keyword AS title, test.file.path AS file_path,' +
      ' buildkite.build.number AS build_number, event.error.message AS error_message',
    `LIMIT ${scope.limit}`,
  ].join(' | ');

  const { records } = await es.helpers.esql({ query }).toRecords<{
    '@timestamp': string;
    title?: string;
    file_path: string;
    build_number?: number;
    error_message?: string;
  }>();

  return records
    .filter((record): record is typeof record & { error_message: string } =>
      Boolean(record.error_message)
    )
    .map((record) => ({
      filePath: record.file_path,
      title: record.title,
      errorMessage: normalizeErrorMessage(record.error_message),
      mechanism: classifyMechanism(record.error_message),
      buildNumber: record.build_number,
      timestamp: record['@timestamp'] ? new Date(record['@timestamp']) : undefined,
    }));
};
