/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import { githubIssue, SUITE_PATH } from '../flaky_test_issues/test_fixtures';
import { FIXABLE_LABEL } from './history';

/** Labels of a `failed-test` issue the investigator found AI-fixable. */
export const LABELS = ['failed-test', FIXABLE_LABEL];

/** A Scout per-test issue, as the failed-test reporter files it. */
export const perTestIssue = (number: number, testId: string, filePath = SUITE_PATH) =>
  githubIssue({
    number,
    labels: [...LABELS],
    body: updateIssueMetadata(`| Location | ${filePath} |\n| Test ID | ${testId} |`, {
      'test.name': testId,
      'test.type': 'scout',
    }),
  });
