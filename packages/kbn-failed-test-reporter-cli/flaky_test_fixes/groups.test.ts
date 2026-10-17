/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import {
  fileWideIssue,
  flakyReport,
  flakyTest,
  githubIssue,
  SUITE_PATH,
} from '../flaky_test_issues/test_fixtures';
import { buildFixGroups } from './groups';
import { LABELS, perTestIssue } from './test_fixtures';

const FTR_PATH = 'x-pack/platform/test/functional/apps/discover/group1/_discover.ts';
const JEST_PATH = 'src/a/client.test.ts';

/** A per-test issue filed before the failed-test reporter recorded `test.type`. */
const legacyIssue = (number: number, className: string, testName: string) =>
  githubIssue({
    number,
    state: 'closed',
    closed_at: '2025-01-01T12:00:00Z',
    labels: ['failed-test'],
    body: updateIssueMetadata('failure', { 'test.class': className, 'test.name': testName }),
  });

const numbers = (issues: Array<{ number: number }>) => issues.map(({ number }) => number);

describe('buildFixGroups', () => {
  it('groups nested describes of one file together', () => {
    const groups = buildFixGroups(
      flakyReport([
        flakyTest({ suiteTitle: 'A', testId: 'a' }),
        flakyTest({ suiteTitle: 'A B', testId: 'b' }),
      ]),
      []
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].suites).toHaveLength(2);
  });

  it('includes sibling cases absent from the report, but targets only affected cases', () => {
    const [group] = buildFixGroups(flakyReport([flakyTest({ testId: 'reported' })]), [
      perTestIssue(1, 'reported'),
      perTestIssue(2, 'below-threshold'),
    ]);
    expect(numbers(group.siblings)).toEqual([1, 2]);
    expect(numbers(group.targets)).toEqual([1]);
  });

  it('prefers suite issues over per-test issues as targets, then the lowest number', () => {
    const [group] = buildFixGroups(flakyReport([flakyTest({ testId: 'reported' })]), [
      perTestIssue(1, 'reported'),
      fileWideIssue(3, { labels: LABELS }),
      fileWideIssue(2, { labels: LABELS }),
    ]);
    expect(numbers(group.targets)).toEqual([2, 3, 1]);
  });

  it('does not promote arbitrary mentions or another framework into the group', () => {
    const [group] = buildFixGroups(flakyReport([flakyTest()]), [
      githubIssue({ number: 1, body: `A stack frame mentions ${SUITE_PATH}` }),
      fileWideIssue(2, { framework: 'jest', labels: LABELS }),
      fileWideIssue(3, { labels: LABELS }),
    ]);
    expect(numbers(group.targets)).toEqual([3]);
    expect(group.ambiguous).toEqual([]);
  });

  it('associates older FTR issues that record no framework by their file', () => {
    const report = flakyReport([flakyTest({ framework: 'ftr', filePath: FTR_PATH })]);
    const className = `Chrome X-Pack UI Functional Tests.${FTR_PATH.replace(/\.ts$/, '·ts')}`;
    const [group] = buildFixGroups(report, [
      legacyIssue(1, className, 'an older flaky test'),
      legacyIssue(2, className, flakyTest().title),
    ]);
    expect(numbers(group.siblings)).toEqual([1, 2]);
    expect(numbers(group.targets)).toEqual([2]);
    expect(group.ambiguous).toEqual([]);
  });

  it('places an older Jest issue that names a flaky test of its directory', () => {
    const [group] = buildFixGroups(
      flakyReport([flakyTest({ filePath: JEST_PATH, framework: 'jest', title: 'connects' })]),
      [legacyIssue(1, 'Jest Tests.src/a', 'connects')]
    );
    expect(numbers(group.targets)).toEqual([1]);
    expect(group.ambiguous).toEqual([]);
  });

  it('holds directory-only Jest identity rather than guessing a file', () => {
    const [group] = buildFixGroups(
      flakyReport([flakyTest({ filePath: JEST_PATH, framework: 'jest' })]),
      [legacyIssue(1, 'Jest Tests.src/a', 'another test')]
    );
    expect(group.siblings).toEqual([]);
    expect(numbers(group.ambiguous)).toEqual([1]);
  });

  it('holds an issue about a flaky test at another location', () => {
    const [group] = buildFixGroups(flakyReport([flakyTest({ testId: 'reported' })]), [
      perTestIssue(1, 'reported', 'old/location/default_status_alert.spec.ts'),
    ]);
    expect(numbers(group.ambiguous)).toEqual([1]);
  });
});
