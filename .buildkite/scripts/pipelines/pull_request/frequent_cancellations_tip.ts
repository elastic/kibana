/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Build } from '#pipeline-utils';
import { BuildkiteClient, upsertComment } from '#pipeline-utils';

export const FREQUENT_CANCELLATIONS_TIP_CONTEXT = 'frequent-cancellations-tip';

const PIPELINE_SLUG = 'kibana-pull-request';
const MIN_CANCELLED_BUILDS = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000;
// Builds cancelled earlier than this had barely started, so they aren't worth a tip.
const MIN_RUNTIME_MS = 10 * 60 * 1000;
const BUILDS_TO_FETCH = 100;
const TIMEOUT_MS = 15_000;

const isBotUser = (login: string): boolean =>
  login.endsWith('[bot]') || login === 'kibanamachine' || login === 'elasticmachine';

type CommitRef = Pick<Build, 'commit' | 'message'>;

const isBotFixCommit = ({ message }: CommitRef): boolean =>
  Boolean(message?.startsWith('Changes from '));

// Drafts only build when the author asks for it, through `/ci` or a draft CI label.
const ranOnDraft = ({ env, meta_data: metaData }: Build): boolean =>
  env?.GITHUB_PR_DRAFT === 'true' || metaData?.['ingest:is_draft_pr'] === 'true';

/**
 * Counts builds of a PR cancelled in the last day after running for a while. Draft builds and
 * builds of, or cancelled by, bot fix commits don't count. `currentCommit` is the running build,
 * which isn't in `finishedBuilds` but may be the one that cancelled the latest of them.
 */
export const countRecentCancelledBuilds = (
  finishedBuilds: readonly Build[],
  prNumber: string,
  currentCommit?: CommitRef,
  now: number = Date.now()
): number => {
  const prBuilds = finishedBuilds
    .filter(({ pull_request: pullRequest }) => pullRequest?.id === prNumber)
    .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));
  const laterCommits: CommitRef[] = currentCommit ? [...prBuilds, currentCommit] : prBuilds;

  return prBuilds.filter((build, index) => {
    const { state, created_at: createdAt, commit } = build;
    const startedAt = Date.parse(build.started_at);
    const finishedAt = Date.parse(build.finished_at);
    const nextCommit = laterCommits.slice(index + 1).find((later) => later.commit !== commit);

    return (
      state === 'canceled' &&
      now - Date.parse(createdAt) <= WINDOW_MS &&
      finishedAt - startedAt >= MIN_RUNTIME_MS &&
      !ranOnDraft(build) &&
      !isBotFixCommit(build) &&
      !(nextCommit && isBotFixCommit(nextCommit))
    );
  }).length;
};

export const getFrequentCancellationsTipMessage = (user: string, cancelledBuilds: number): string =>
  '### 🌯 Save a burrito\n\n' +
  `@${user}, if you're still iterating on this PR, **consider converting it to draft**: ` +
  `${cancelledBuilds} CI builds were cancelled in the last day before they finished. ` +
  "Drafts don't run CI automatically, and you can comment `/ci` whenever you want a build.";

const postTip = async (): Promise<void> => {
  const {
    BUILDKITE_PIPELINE_SLUG,
    BUILDKITE_BRANCH,
    BUILDKITE_COMMIT,
    BUILDKITE_MESSAGE,
    GITHUB_PR_NUMBER,
    GITHUB_PR_USER,
    GITHUB_PR_DRAFT,
  } = process.env;

  if (
    BUILDKITE_PIPELINE_SLUG !== PIPELINE_SLUG ||
    !BUILDKITE_BRANCH ||
    !GITHUB_PR_NUMBER ||
    !GITHUB_PR_USER ||
    GITHUB_PR_DRAFT === 'true' ||
    isBotUser(GITHUB_PR_USER)
  ) {
    return;
  }

  // PR builds have hundreds of jobs each, and only build-level fields are needed here.
  // A hung request would keep the process alive, delaying the pipeline upload, so it needs its own timeout.
  const finishedBuilds = await new BuildkiteClient({
    timeoutMs: TIMEOUT_MS,
  }).getFinishedBuildsForBranch(PIPELINE_SLUG, BUILDKITE_BRANCH, BUILDS_TO_FETCH, {
    excludeJobs: true,
  });

  const cancelledBuilds = countRecentCancelledBuilds(
    finishedBuilds,
    GITHUB_PR_NUMBER,
    BUILDKITE_COMMIT ? { commit: BUILDKITE_COMMIT, message: BUILDKITE_MESSAGE ?? '' } : undefined
  );
  if (cancelledBuilds < MIN_CANCELLED_BUILDS) {
    return;
  }

  await upsertComment({
    commentBody: getFrequentCancellationsTipMessage(GITHUB_PR_USER, cancelledBuilds),
    commentContext: FREQUENT_CANCELLATIONS_TIP_CONTEXT,
    clearPrevious: false,
  });
};

/** Posts a one-time tip on PRs where many running builds were cancelled in the last day. Never throws. */
export const postFrequentCancellationsTip = async (): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
    timer.unref();
  });

  try {
    await Promise.race([postTip(), timeout]);
  } catch (error) {
    console.error('Failed to post the frequent cancellations tip, continuing', error);
  } finally {
    clearTimeout(timer);
  }
};
