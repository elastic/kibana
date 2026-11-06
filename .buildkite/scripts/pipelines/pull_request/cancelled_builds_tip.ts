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
// Builds cancelled earlier than this had barely started, so they aren't worth a tip.
const MIN_RUNTIME_MS = 10 * 60 * 1000;
// A superseded build is cancelled within moments of its replacement being created.
const SUPERSEDED_GRACE_MS = 5 * 60 * 1000;
const BUILDS_TO_FETCH = 100;
const TIMEOUT_MS = 15_000;

const isBotUser = (login: string): boolean =>
  login.endsWith('[bot]') || login === 'kibanamachine' || login === 'elasticmachine';

const isBotFixCommit = ({ message, author }: Build): boolean =>
  message.startsWith('Changes from ') ||
  Boolean(author?.name?.includes('kibanamachine') || author?.email?.includes('kibanamachine'));

const toMs = (timestamp: string | null | undefined): number | null =>
  timestamp ? Date.parse(timestamp) : null;

/** Counts builds of a PR that ran for a while and were then cancelled by a newer human push. */
export const countBuildsCancelledByPushes = (
  builds: readonly Build[],
  prNumber: string
): number => {
  const prBuilds = builds
    .filter((build) => build.pull_request?.id === prNumber)
    .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));

  return prBuilds.filter((build, index) => {
    const startedAt = toMs(build.started_at);
    const finishedAt = toMs(build.finished_at);
    if (build.state !== 'canceled' || startedAt === null || finishedAt === null) {
      return false;
    }
    if (finishedAt - startedAt < MIN_RUNTIME_MS) {
      return false;
    }

    const successor = prBuilds
      .slice(index + 1)
      .find((candidate) => candidate.commit !== build.commit);
    if (!successor || isBotFixCommit(successor)) {
      return false;
    }

    return Date.parse(successor.created_at) <= finishedAt + SUPERSEDED_GRACE_MS;
  }).length;
};

export const getCancelledBuildsTipMessage = (user: string, cancelledBuilds: number): string =>
  `👋 @${user}, your recent pushes cancelled ${cancelledBuilds} CI builds on this PR that were still running. ` +
  "When iterating, we recommend converting the PR to draft: drafts don't run CI on every push, " +
  'and you can comment `/ci` whenever you want a build.';

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

  const buildkite = new BuildkiteClient();
  const [finishedBuilds, currentBuild] = await Promise.all([
    buildkite.getFinishedBuildsForBranch(PIPELINE_SLUG, BUILDKITE_BRANCH, BUILDS_TO_FETCH),
    buildkite.getCurrentBuild(),
  ]);

  const cancelledBuilds = countBuildsCancelledByPushes(
    [...finishedBuilds, currentBuild],
    GITHUB_PR_NUMBER
  );
  if (cancelledBuilds < MIN_CANCELLED_BUILDS) {
    return;
  }

  await upsertComment({
    commentBody: getCancelledBuildsTipMessage(GITHUB_PR_USER, cancelledBuilds),
    commentContext: CANCELLED_BUILDS_TIP_CONTEXT,
    clearPrevious: false,
  });
};

/** Posts a one-time tip on PRs whose pushes keep cancelling running builds. Never throws. */
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
