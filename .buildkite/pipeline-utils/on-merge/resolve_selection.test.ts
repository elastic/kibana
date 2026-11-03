/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import type { Build } from '../buildkite/types/build.ts';
import type { Job } from '../buildkite/types/job.ts';
import type { OnMergeSelectionDeps } from './resolve_selection.ts';
import { resolveOnMergeSelection } from './resolve_selection.ts';
import { STEP_KEYS } from '../ci-stats/pick_test_group_run_order/const.ts';
import { SCOUT_STEP_KEYS } from '../scout/step_keys.ts';
import { ON_MERGE_SELECTION_METADATA_KEY, fullSelection } from './selection.ts';

const COMMIT = 'c'.repeat(40);
const BASE = 'b'.repeat(40);
const PARENT = 'a'.repeat(40);
const MANIFEST = 'https://example.com/manifest.json';

const job = (stepKey: string, overrides: Partial<Job> = {}): Job =>
  ({
    type: 'script',
    step_key: stepKey,
    state: 'passed',
    retried: false,
    soft_failed: false,
    ...overrides,
  } as Job);

const previousBuild = (overrides: Partial<Build> = {}): Build =>
  ({
    number: 99,
    env: {},
    meta_data: { ES_SNAPSHOT_MANIFEST_DEFAULT: MANIFEST },
    jobs: [job('jest'), job('jest-integration'), job('ftr_configs_0'), job('scout_test_lane_1')],
    ...overrides,
  } as Build);

const createDeps = (overrides: Partial<OnMergeSelectionDeps> = {}): OnMergeSelectionDeps => ({
  commit: COMMIT,
  buildNumber: 100,
  forceFull: false,
  esSnapshotManifest: MANIFEST,
  findPushActivity: jest
    .fn()
    .mockResolvedValue({ before: BASE, activityType: 'merge_queue_merge' }),
  getMergeQueueBase: jest.fn().mockResolvedValue(null),
  getPreviousFinishedBuilds: jest.fn().mockResolvedValue([previousBuild()]),
  git: {
    ensureCommit: jest.fn().mockReturnValue(true),
    isAncestor: jest.fn().mockReturnValue(true),
    countFirstParentCommits: jest.fn().mockReturnValue(3),
  },
  ...overrides,
});

const allSelective = {
  scout: { mode: 'selective' },
  jestUnit: { mode: 'selective' },
  jestIntegration: { mode: 'selective' },
  ftr: { mode: 'selective' },
};

const allFull = (reason: string) => ({
  scout: { mode: 'full', reason },
  jestUnit: { mode: 'full', reason },
  jestIntegration: { mode: 'full', reason },
  ftr: { mode: 'full', reason },
});

const selectiveBuild = (number: number, overrides: Partial<Build> = {}): Build =>
  previousBuild({
    number,
    meta_data: {
      ES_SNAPSHOT_MANIFEST_DEFAULT: MANIFEST,
      [ON_MERGE_SELECTION_METADATA_KEY]: JSON.stringify({
        ...fullSelection(COMMIT, 'unused'),
        testTypes: allSelective,
      }),
    },
    ...overrides,
  });

describe('resolveOnMergeSelection', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the push range from GitHub activity for merge-queue landings', async () => {
    const deps = createDeps();
    await expect(resolveOnMergeSelection(deps)).resolves.toEqual({
      commit: COMMIT,
      base: BASE,
      baseSource: 'github-activity',
      commitCount: 3,
      testTypes: allSelective,
    });
    expect(deps.getMergeQueueBase).not.toHaveBeenCalled();
  });

  it('uses the push range from GitHub activity for direct pushes', async () => {
    const deps = createDeps({
      findPushActivity: jest.fn().mockResolvedValue({ before: PARENT, activityType: 'push' }),
      git: { ...createDeps().git, countFirstParentCommits: jest.fn().mockReturnValue(1) },
    });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      base: PARENT,
      baseSource: 'github-activity',
      commitCount: 1,
      testTypes: allSelective,
    });
  });

  it('falls back to the merge-queue base when GitHub activity has no entry', async () => {
    const deps = createDeps({
      findPushActivity: jest.fn().mockResolvedValue(null),
      getMergeQueueBase: jest.fn().mockResolvedValue(BASE),
    });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      base: BASE,
      baseSource: 'merge-queue',
    });
  });

  it('falls back to the merge-queue base when GitHub activity lookup fails', async () => {
    const deps = createDeps({
      findPushActivity: jest.fn().mockRejectedValue(new Error('rate limited')),
      getMergeQueueBase: jest.fn().mockResolvedValue(BASE),
    });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      baseSource: 'merge-queue',
    });
    expect(console.error).toHaveBeenCalledWith('GitHub activity lookup failed: rate limited');
  });

  it('runs everything in full when the push boundary cannot be resolved', async () => {
    const deps = createDeps({ findPushActivity: jest.fn().mockResolvedValue(null) });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      base: null,
      testTypes: allFull('cannot resolve push boundary'),
    });
  });

  it.each([
    ['force pushes', { before: BASE, activityType: 'force_push' }, 'force push'],
    ['branch creation', { before: '0'.repeat(40), activityType: 'push' }, 'branch creation'],
  ])('runs everything in full for %s', async (_, activity, reason) => {
    const deps = createDeps({ findPushActivity: jest.fn().mockResolvedValue(activity) });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      base: null,
      testTypes: allFull(reason),
    });
  });

  it('runs everything in full when forced', async () => {
    const deps = createDeps({ forceFull: true });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      testTypes: allFull('forced full run'),
    });
    expect(deps.findPushActivity).not.toHaveBeenCalled();
  });

  it('runs everything in full when the base is not a full SHA', async () => {
    const deps = createDeps({
      findPushActivity: jest.fn().mockResolvedValue(null),
      getMergeQueueBase: jest.fn().mockResolvedValue('main'),
    });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      testTypes: allFull('base main from merge-queue is not a full SHA'),
    });
  });

  it.each([
    [
      'the base is unavailable',
      { ensureCommit: jest.fn().mockReturnValue(false) },
      `base ${BASE} is not available locally`,
    ],
    [
      'the base is not an ancestor',
      { isAncestor: jest.fn().mockReturnValue(false) },
      `base ${BASE} is not an ancestor of ${COMMIT}`,
    ],
    [
      'the range is too large',
      { countFirstParentCommits: jest.fn().mockReturnValue(31) },
      'range has 31 commits (max 30)',
    ],
  ])('runs everything in full when %s', async (_, gitOverrides, reason) => {
    const deps = createDeps({ git: { ...createDeps().git, ...gitOverrides } });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      testTypes: allFull(reason),
    });
  });

  it('keeps the base but runs in full without a previous finished build', async () => {
    const deps = createDeps({ getPreviousFinishedBuilds: jest.fn().mockResolvedValue([]) });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      base: BASE,
      testTypes: allFull('no previous finished build'),
    });
  });

  it('runs only the test types that failed in the previous build in full', async () => {
    const deps = createDeps({
      getPreviousFinishedBuilds: jest.fn().mockResolvedValue([
        previousBuild({
          jobs: [
            job('jest'),
            job('ftr_configs_3', { state: 'failed' }),
            job('scout_test_lane_2', { state: 'failed', soft_failed: true }),
            job('jest-integration', { state: 'failed', retried: true }),
          ],
        }),
      ]),
    });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      testTypes: {
        ...allSelective,
        ftr: { mode: 'full', reason: 'did not pass in previous build #99' },
      },
    });
  });

  it.each(['broken', 'canceled'] as const)(
    'runs a test type in full when its previous job was %s',
    async (state) => {
      const deps = createDeps({
        getPreviousFinishedBuilds: jest.fn().mockResolvedValue([
          previousBuild({
            jobs: [
              job('jest'),
              job('jest-integration'),
              job('scout_test_lane_1'),
              job('ftr_configs_0', { state }),
            ],
          }),
        ]),
      });
      await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
        testTypes: {
          ...allSelective,
          ftr: { mode: 'full', reason: 'did not pass in previous build #99' },
        },
      });
    }
  );

  it('runs the test types uploaded by a failed step in full when their jobs never ran', async () => {
    const full = { mode: 'full', reason: 'did not pass in previous build #99' };
    const resolveWithFailedStep = (stepKey: string) =>
      resolveOnMergeSelection(
        createDeps({
          getPreviousFinishedBuilds: jest
            .fn()
            .mockResolvedValue([previousBuild({ jobs: [job(stepKey, { state: 'failed' })] })]),
        })
      );

    await expect(resolveWithFailedStep('pick_test_group_run_order')).resolves.toMatchObject({
      testTypes: { ...allSelective, jestUnit: full, jestIntegration: full, ftr: full },
    });
    await expect(resolveWithFailedStep('build_scout_tests')).resolves.toMatchObject({
      testTypes: { ...allSelective, scout: full },
    });
  });

  it('keeps a failure until the test type passes a full run', async () => {
    const deps = createDeps({
      getPreviousFinishedBuilds: jest
        .fn()
        .mockResolvedValue([
          selectiveBuild(99),
          previousBuild({ number: 98, jobs: [job('ftr_configs_0', { state: 'failed' })] }),
        ]),
    });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      testTypes: {
        ...allSelective,
        ftr: { mode: 'full', reason: 'did not pass in previous build #98' },
      },
    });
  });

  it('ignores failures before the last full run', async () => {
    const deps = createDeps({
      getPreviousFinishedBuilds: jest
        .fn()
        .mockResolvedValue([
          selectiveBuild(99),
          previousBuild({ number: 98 }),
          previousBuild({ number: 97, jobs: [job('ftr_configs_0', { state: 'failed' })] }),
        ]),
    });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({ testTypes: allSelective });
  });

  it('runs in full when no recent build ran the test type in full', async () => {
    const deps = createDeps({
      getPreviousFinishedBuilds: jest
        .fn()
        .mockResolvedValue([selectiveBuild(99), selectiveBuild(98)]),
    });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      testTypes: allFull('no full run in the last 2 finished builds'),
    });
  });

  it('matches the step keys declared in on_merge.yml', () => {
    const pipeline = Fs.readFileSync(
      Path.resolve(__dirname, '../../pipelines/on_merge.yml'),
      'utf8'
    );
    expect(pipeline).toContain(`key: ${STEP_KEYS.PICK_TEST_GROUP_RUN_ORDER}`);
    expect(pipeline).toContain(`key: ${SCOUT_STEP_KEYS.BUILDER}`);
  });

  it('runs ES-dependent test types in full when the ES snapshot changed', async () => {
    const deps = createDeps({ esSnapshotManifest: 'https://example.com/new.json' });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({
      testTypes: {
        jestUnit: { mode: 'selective' },
        scout: { mode: 'full', reason: 'ES snapshot changed' },
        jestIntegration: { mode: 'full', reason: 'ES snapshot changed' },
        ftr: { mode: 'full', reason: 'ES snapshot changed' },
      },
    });
  });

  it('compares against a custom ES snapshot used by the previous build', async () => {
    const deps = createDeps({
      esSnapshotManifest: 'https://example.com/custom.json',
      getPreviousFinishedBuilds: jest
        .fn()
        .mockResolvedValue([
          previousBuild({ env: { ES_SNAPSHOT_MANIFEST: 'https://example.com/custom.json' } }),
        ]),
    });
    await expect(resolveOnMergeSelection(deps)).resolves.toMatchObject({ testTypes: allSelective });
  });
});
