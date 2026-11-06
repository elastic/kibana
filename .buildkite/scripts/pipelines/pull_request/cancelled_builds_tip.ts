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

export const CANCELLED_BUILDS_TIP_CONTEXT = 'cancelled-builds-tip';

const PIPELINE_SLUG = 'kibana-pull-request';
const MIN_CANCELLED_BUILDS = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000;
// Builds cancelled earlier than this had barely started, so they aren't worth a tip.
const MIN_RUNTIME_MS = 10 * 60 * 1000;
const BUILDS_TO_FETCH = 100;
const TIMEOUT_MS = 15_000;

const isBotUser = (login: string): boolean =>
  login.endsWith('[bot]') || login === 'kibanamachine' || login === 'elasticmachine';

const isBotFixCommit = ({ message }: Build): boolean =>
  Boolean(message?.startsWith('Changes from '));

// Drafts only build when the author asks for it, through `/ci` or a draft CI label.
const ranOnDraft = ({ env, meta_data: metaData }: Build): boolean =>
  env?.GITHUB_PR_DRAFT === 'true' || metaData?.['ingest:is_draft_pr'] === 'true';

/** Counts builds of a PR cancelled in the last day after running for a while, ignoring drafts and bot fix commits. */
export const countRecentCancelledBuilds = (
  builds: readonly Build[],
  prNumber: string,
  now: number = Date.now()
): number =>
  builds.filter((build) => {
    const { state, pull_request: pullRequest, created_at: createdAt } = build;
    const startedAt = Date.parse(build.started_at);
    const finishedAt = Date.parse(build.finished_at);

    return (
      pullRequest?.id === prNumber &&
      state === 'canceled' &&
      now - Date.parse(createdAt) <= WINDOW_MS &&
      finishedAt - startedAt >= MIN_RUNTIME_MS &&
      !ranOnDraft(build) &&
      !isBotFixCommit(build)
    );
  }).length;

export const getCancelledBuildsTipMessage = (user: string, cancelledBuilds: number): string =>
  '### 🌯 Save a burrito\n\n' +
  `@${user}, if you're still iterating on this PR, **consider converting it to draft**: ` +
  `${cancelledBuilds} CI builds were cancelled in the last day before they finished. ` +
  "Drafts don't run CI automatically, and you can comment `/ci` whenever you want a build.";

const postTip = async (): Promise<void> => {
  const {
    BUILDKITE_PIPELINE_SLUG,
    BUILDKITE_BRANCH,
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

  const cancelledBuilds = countRecentCancelledBuilds(finishedBuilds, GITHUB_PR_NUMBER);
  if (cancelledBuilds < MIN_CANCELLED_BUILDS) {
    return;
  }

  await upsertComment({
    commentBody: getCancelledBuildsTipMessage(GITHUB_PR_USER, cancelledBuilds),
    commentContext: CANCELLED_BUILDS_TIP_CONTEXT,
    clearPrevious: false,
  });
};

/** Posts a one-time tip on PRs where many running builds were cancelled in the last day. Never throws. */
export const postCancelledBuildsTip = async (): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
    timer.unref();
  });

  try {
    await Promise.race([postTip(), timeout]);
  } catch (error) {
    console.error('Failed to post the cancelled builds tip, continuing', error);
  } finally {
    clearTimeout(timer);
  }
};
