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
import type { OnMergeSelection, OnMergeSuite, OnMergeSuiteDecision } from './selection.ts';
import { ON_MERGE_SUITES, fullSelection } from './selection.ts';

const MAX_COMMITS = 30;
const FULL_SHA = /^[0-9a-f]{40}$/i;
const NULL_SHA = /^0{40}$/;

const ES_DEPENDENT_SUITES: ReadonlySet<OnMergeSuite> = new Set(['scout', 'jestIntegration', 'ftr']);
const FAILED_JOB_STATES: ReadonlySet<string> = new Set(['failed', 'timed_out', 'timing_out']);

const SUITE_STEP_KEY_MATCHERS: Record<OnMergeSuite, (stepKey: string) => boolean> = {
  scout: (stepKey) => stepKey.startsWith('scout_test_lane_'),
  jestUnit: (stepKey) => stepKey === STEP_KEYS.JEST_UNIT,
  jestIntegration: (stepKey) => stepKey === STEP_KEYS.JEST_INTEGRATION,
  ftr: (stepKey) => /^ftr_configs_\d+$/.test(stepKey),
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
    getParents(commit: string): string[];
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
  git,
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

  const parents = git.getParents(commit);
  if (parents.length === 1) {
    return { base: parents[0], baseSource: 'direct-push' };
  }
  return { reason: `cannot resolve base (commit has ${parents.length} parents)` };
};

const isFailedJob = (job: Job): boolean =>
  job.type === 'script' && !job.retried && !job.soft_failed && FAILED_JOB_STATES.has(job.state);

const decideSuite = (
  suite: OnMergeSuite,
  previousBuild: Build,
  esSnapshotChanged: boolean
): OnMergeSuiteDecision => {
  const failedInPreviousBuild = previousBuild.jobs?.some(
    (job) => job.step_key && SUITE_STEP_KEY_MATCHERS[suite](job.step_key) && isFailedJob(job)
  );
  if (failedInPreviousBuild) {
    return { mode: 'full', reason: `failed in previous build #${previousBuild.number}` };
  }
  if (esSnapshotChanged && ES_DEPENDENT_SUITES.has(suite)) {
    return { mode: 'full', reason: 'ES snapshot changed' };
  }
  return { mode: 'selective' };
};

/** Resolves the commit range an on-merge build covers and which suites may select tests from it. */
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
  const suites = Object.fromEntries(
    ON_MERGE_SUITES.map((suite) => [suite, decideSuite(suite, previousBuild, esSnapshotChanged)])
  ) as OnMergeSelection['suites'];

  return { commit, base, baseSource, commitCount, suites };
};
