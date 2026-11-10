/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildkiteClient } from '../buildkite/client.ts';
import { PIPELINES } from '../ci-stats/pick_test_group_run_order/const.ts';
import { getGithubClient } from '../github/github.ts';
import { git } from '../git.ts';
import type { OnMergeSelectionDeps } from './resolve_selection.ts';

const MAX_ACTIVITY_PAGES = 3;
// Builds are listed newest first and include all jobs, so keep the page small.
const PREVIOUS_BUILDS_PAGE_SIZE = 10;

const gitSucceeds = (args: string[]): boolean => {
  try {
    git(args);
    return true;
  } catch {
    return false;
  }
};

const commitExists = (commit: string) => gitSucceeds(['cat-file', '-e', `${commit}^{commit}`]);

/** Wires the resolver to GitHub, Buildkite and the local git checkout. */
export const createDefaultOnMergeSelectionDeps = ({
  bk,
  pipelineSlug,
  branch,
  ...rest
}: Pick<OnMergeSelectionDeps, 'commit' | 'buildNumber' | 'forceFull' | 'esSnapshotManifest'> & {
  bk: BuildkiteClient;
  pipelineSlug: string;
  branch: string;
}): OnMergeSelectionDeps => ({
  ...rest,

  findPushActivity: async (commit) => {
    const github = getGithubClient();
    let page = 0;
    for await (const { data } of github.paginate.iterator(github.repos.listActivities, {
      owner: 'elastic',
      repo: 'kibana',
      ref: `refs/heads/${branch}`,
      per_page: 100,
    })) {
      const activity = data.find(({ after }) => after === commit);
      if (activity) {
        return { before: activity.before, activityType: activity.activity_type };
      }
      if (++page >= MAX_ACTIVITY_PAGES) {
        break;
      }
    }
    return null;
  },

  getMergeQueueBase: async (commit) => {
    const build = await bk.getBuildForCommit(PIPELINES.MERGE_QUEUE, commit);
    return build?.meta_data?.['merge-queue-merge-base'] || null;
  },

  getPreviousFinishedBuilds: async (buildNumber) => {
    const builds = await bk.getFinishedBuildsForBranch(
      pipelineSlug,
      branch,
      PREVIOUS_BUILDS_PAGE_SIZE
    );
    return builds.filter(({ number }) => number < buildNumber);
  },

  git: {
    ensureCommit: (commit) =>
      commitExists(commit) ||
      (gitSucceeds(['fetch', '--no-tags', 'origin', commit]) && commitExists(commit)),
    isAncestor: (ancestor, commit) =>
      gitSucceeds(['merge-base', '--is-ancestor', '--end-of-options', ancestor, commit]),
    countFirstParentCommits: (base, head) =>
      parseInt(git(['rev-list', '--count', '--first-parent', `${base}..${head}`]), 10),
  },
});
