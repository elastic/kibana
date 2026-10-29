/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Build } from '../buildkite/types/build.ts';
import type { Job } from '../buildkite/types/job.ts';
import { STEP_KEYS } from '../ci-stats/pick_test_group_run_order/const.ts';
import type { OnMergeSelection, OnMergeTestType, OnMergeTestTypeDecision } from './selection.ts';
import { ON_MERGE_TEST_TYPES, fullSelection } from './selection.ts';

const MAX_COMMITS = 30;
const FULL_SHA = /^[0-9a-f]{40}$/i;
const NULL_SHA = /^0{40}$/;

const ES_DEPENDENT_TEST_TYPES: ReadonlySet<OnMergeTestType> = new Set([
  'scout',
  'jestIntegration',
  'ftr',
]);
// A job that never ran is not evidence the test type passed, and this build's range won't cover
// the commits it skipped. `broken` = a dependency failed, `canceled` = build stopped part-way.
const UNPROVEN_JOB_STATES: ReadonlySet<string> = new Set([
  'failed',
  'timed_out',
  'timing_out',
  'broken',
  'canceled',
]);

// The picker and the Scout builder upload the test jobs: if they failed, those jobs never existed.
const PICK_TEST_GROUP_RUN_ORDER_STEP_KEY = 'pick_test_group_run_order';
const SCOUT_BUILDER_STEP_KEY = 'build_scout_tests';

const TEST_TYPE_STEP_KEY_MATCHERS: Record<OnMergeTestType, (stepKey: string) => boolean> = {
  scout: (stepKey) => stepKey === SCOUT_BUILDER_STEP_KEY || stepKey.startsWith('scout_test_lane_'),
  jestUnit: (stepKey) =>
    stepKey === PICK_TEST_GROUP_RUN_ORDER_STEP_KEY || stepKey === STEP_KEYS.JEST_UNIT,
  jestIntegration: (stepKey) =>
    stepKey === PICK_TEST_GROUP_RUN_ORDER_STEP_KEY || stepKey === STEP_KEYS.JEST_INTEGRATION,
  ftr: (stepKey) =>
    stepKey === PICK_TEST_GROUP_RUN_ORDER_STEP_KEY || /^ftr_configs_\d+$/.test(stepKey),
};

export interface OnMergeSelectionDeps {
  commit: string;
  buildNumber: number;
  forceFull: boolean;
  esSnapshotManifest: string | undefined;
  findPushActivity(commit: string): Promise<{ before: string; activityType: string } | null>;
  getMergeQueueBase(commit: string): Promise<string | null>;
  getPreviousFinishedBuild(buildNumber: number): Promise<Build | null>;
  git: {
    ensureCommit(commit: string): boolean;
    isAncestor(ancestor: string, commit: string): boolean;
    countFirstParentCommits(base: string, head: string): number;
  };
}

type BaseResolution =
  | { base: string; baseSource: NonNullable<OnMergeSelection['baseSource']> }
  | { reason: string };

const logLookupError = (lookup: string) => (error: Error) => {
  console.error(`${lookup} lookup failed: ${error.message}`);
  return null;
};

const resolveBase = async ({
  commit,
  findPushActivity,
  getMergeQueueBase,
}: OnMergeSelectionDeps): Promise<BaseResolution> => {
  const activity = await findPushActivity(commit).catch(logLookupError('GitHub activity'));
  if (activity?.activityType === 'force_push') {
    return { reason: 'force push' };
  }
  if (activity && NULL_SHA.test(activity.before)) {
    return { reason: 'branch creation' };
  }
  if (activity) {
    return { base: activity.before, baseSource: 'github-activity' };
  }

  const mergeQueueBase = await getMergeQueueBase(commit).catch(logLookupError('Merge-queue base'));
  if (mergeQueueBase) {
    return { base: mergeQueueBase, baseSource: 'merge-queue' };
  }

  // The parent commit is not a safe fallback: a direct push may contain several commits.
  return { reason: 'cannot resolve push boundary' };
};

const isUnprovenJob = (job: Job): boolean =>
  job.type === 'script' && !job.retried && !job.soft_failed && UNPROVEN_JOB_STATES.has(job.state);

const decideTestType = (
  testType: OnMergeTestType,
  previousBuild: Build,
  esSnapshotChanged: boolean
): OnMergeTestTypeDecision => {
  const unprovenInPreviousBuild = previousBuild.jobs?.some(
    (job) =>
      job.step_key && TEST_TYPE_STEP_KEY_MATCHERS[testType](job.step_key) && isUnprovenJob(job)
  );
  if (unprovenInPreviousBuild) {
    return { mode: 'full', reason: `did not pass in previous build #${previousBuild.number}` };
  }
  if (esSnapshotChanged && ES_DEPENDENT_TEST_TYPES.has(testType)) {
    return { mode: 'full', reason: 'ES snapshot changed' };
  }
  return { mode: 'selective' };
};

/** Resolves the commit range an on-merge build covers and which test types may select tests from it. */
export const resolveOnMergeSelection = async (
  deps: OnMergeSelectionDeps
): Promise<OnMergeSelection> => {
  const { commit, git } = deps;

  if (deps.forceFull) {
    return fullSelection(commit, 'forced full run');
  }

  const resolution = await resolveBase(deps);
  if ('reason' in resolution) {
    return fullSelection(commit, resolution.reason);
  }

  const { base, baseSource } = resolution;
  if (!FULL_SHA.test(base)) {
    return fullSelection(commit, `base ${base} from ${baseSource} is not a full SHA`);
  }
  if (!git.ensureCommit(base)) {
    return fullSelection(commit, `base ${base} is not available locally`);
  }
  if (!git.isAncestor(base, commit)) {
    return fullSelection(commit, `base ${base} is not an ancestor of ${commit}`);
  }

  const commitCount = git.countFirstParentCommits(base, commit);
  if (commitCount < 1 || commitCount > MAX_COMMITS) {
    return fullSelection(commit, `range has ${commitCount} commits (max ${MAX_COMMITS})`);
  }

  const previousBuild = await deps
    .getPreviousFinishedBuild(deps.buildNumber)
    .catch(logLookupError('Previous build'));
  if (!previousBuild) {
    return {
      ...fullSelection(commit, 'no previous finished build'),
      base,
      baseSource,
      commitCount,
    };
  }

  const previousManifest =
    previousBuild.env?.ES_SNAPSHOT_MANIFEST ||
    previousBuild.meta_data?.ES_SNAPSHOT_MANIFEST_DEFAULT;
  const esSnapshotChanged =
    !deps.esSnapshotManifest || deps.esSnapshotManifest !== previousManifest;
  const testTypes = Object.fromEntries(
    ON_MERGE_TEST_TYPES.map((testType) => [
      testType,
      decideTestType(testType, previousBuild, esSnapshotChanged),
    ])
  ) as OnMergeSelection['testTypes'];

  return { commit, base, baseSource, commitCount, testTypes };
};
