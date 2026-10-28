/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Build } from '#pipeline-utils';

import {
  filterFinishedMainBuilds,
  findConsecutiveScheduledFailures,
  findQualityGateFailures,
} from './build_checks.ts';

const GATE_MESSAGE =
  'qa: test kibana after update to 47fe4b8bc4c2 (triggered by pipeline.tests-qa.yaml)';
const SCHEDULED_MESSAGE = 'Scheduled QA Smoke Tests';

const window = {
  start: new Date('2026-10-28T10:00:00Z'),
  end: new Date('2026-10-28T11:00:00Z'),
};

const makeBuild = (overrides: Partial<Build>): Build =>
  ({
    number: 1,
    state: 'failed',
    branch: 'main',
    message: GATE_MESSAGE,
    finished_at: '2026-10-28T10:30:00Z',
    web_url: 'https://buildkite.com/elastic/fleet-smoke-tests/builds/1',
    ...overrides,
  } as Build);

describe('filterFinishedMainBuilds', () => {
  it('keeps only passed and failed builds on main', () => {
    const builds = [
      makeBuild({ number: 1, state: 'passed' }),
      makeBuild({ number: 2, state: 'failed' }),
      makeBuild({ number: 3, state: 'running' }),
      makeBuild({ number: 4, state: 'canceled' }),
      makeBuild({ number: 5, branch: 'other' }),
    ];

    expect(filterFinishedMainBuilds(builds).map((b) => b.number)).toEqual([1, 2]);
  });
});

describe('findQualityGateFailures', () => {
  it('returns failed gate builds that finished in the window', () => {
    const build = makeBuild({});

    expect(findQualityGateFailures([build], window)).toEqual([build]);
  });

  it('includes the window end and excludes the window start', () => {
    const atEnd = makeBuild({ number: 1, finished_at: '2026-10-28T11:00:00Z' });
    const atStart = makeBuild({ number: 2, finished_at: '2026-10-28T10:00:00Z' });

    expect(findQualityGateFailures([atEnd, atStart], window)).toEqual([atEnd]);
  });

  it('does not return the same build for consecutive windows', () => {
    const build = makeBuild({ finished_at: '2026-10-28T09:58:00Z' });
    const previousWindow = {
      start: new Date('2026-10-28T09:00:00Z'),
      end: window.start,
    };

    expect(findQualityGateFailures([build], previousWindow)).toEqual([build]);
    expect(findQualityGateFailures([build], window)).toEqual([]);
  });

  it('ignores failures that finished before or after the window', () => {
    const stale = makeBuild({ number: 1, finished_at: '2026-10-28T09:59:59Z' });
    const future = makeBuild({ number: 2, finished_at: '2026-10-28T11:00:01Z' });

    expect(findQualityGateFailures([stale, future], window)).toEqual([]);
  });

  it('ignores passed builds', () => {
    expect(findQualityGateFailures([makeBuild({ state: 'passed' })], window)).toEqual([]);
  });

  it('ignores builds that were not triggered by the quality gate', () => {
    const scheduled = makeBuild({ message: SCHEDULED_MESSAGE });
    const noMessage = makeBuild({ message: undefined });

    expect(findQualityGateFailures([scheduled, noMessage], window)).toEqual([]);
  });
});

describe('findConsecutiveScheduledFailures', () => {
  const scheduled = (number: number, state: Build['state']) =>
    makeBuild({ number, state, message: SCHEDULED_MESSAGE });

  it('returns the last N builds when they all failed', () => {
    const builds = [scheduled(5, 'failed'), scheduled(4, 'failed'), scheduled(3, 'failed')];

    expect(findConsecutiveScheduledFailures(builds, 3)).toEqual(builds);
  });

  it('returns nothing when a build in the last N passed', () => {
    const builds = [scheduled(5, 'failed'), scheduled(4, 'passed'), scheduled(3, 'failed')];

    expect(findConsecutiveScheduledFailures(builds, 3)).toEqual([]);
  });

  it('returns nothing when there are fewer than N scheduled builds', () => {
    const builds = [scheduled(2, 'failed'), scheduled(1, 'failed')];

    expect(findConsecutiveScheduledFailures(builds, 3)).toEqual([]);
  });

  it('ignores quality gate builds', () => {
    const builds = [
      makeBuild({ number: 6, state: 'passed', message: GATE_MESSAGE }),
      scheduled(5, 'failed'),
      scheduled(4, 'failed'),
      scheduled(3, 'failed'),
    ];

    expect(findConsecutiveScheduledFailures(builds, 3)).toEqual(builds.slice(1));
  });

  it('coexists with a quality gate failure in the same builds', () => {
    const gate = makeBuild({ number: 6, state: 'failed', message: GATE_MESSAGE });
    const builds = [gate, scheduled(5, 'passed'), scheduled(4, 'failed')];

    expect(findQualityGateFailures(builds, window)).toEqual([gate]);
    expect(findConsecutiveScheduledFailures(builds, 3)).toEqual([]);
  });
});
