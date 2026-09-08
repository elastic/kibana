/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGithubClient } from './github';

/**
 * GitHub's stacked pull requests (public preview, 2026-07-30) let a change land as an
 * ordered chain of PRs, each targeting the one below it. GITHUB_PR_TARGET_BRANCH is set by
 * the vault GitHub plugin to a PR's *direct* base, so above the bottom of a stack it holds a
 * sibling feature branch rather than the branch the change is ultimately headed for.
 */

interface StackQueryResponse {
  repository?: {
    pullRequest?: {
      stack?: {
        baseRefName?: string | null;
      } | null;
    } | null;
  } | null;
}

const STACK_BASE_QUERY = `
  query stackBase($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        stack {
          baseRefName
        }
      }
    }
  }
`;

/**
 * The branch a PR's change is ultimately headed for: the base of its stack when it
 * belongs to one, otherwise its own target branch.
 *
 * Resolution is best-effort by design. A PR that is not stacked, a token without the
 * scope to see the stack, and an API outage are all indistinguishable here and all mean
 * the same thing for CI: fall back to GITHUB_PR_TARGET_BRANCH and behave exactly as
 * before. Failing open keeps an unrelated GitHub problem from silently reshaping the
 * pipeline.
 */
export async function getEffectiveTargetBranch(
  owner = process.env.GITHUB_PR_BASE_OWNER,
  repo = process.env.GITHUB_PR_BASE_REPO,
  prNumber: undefined | string | number = process.env.GITHUB_PR_NUMBER,
  targetBranch = process.env.GITHUB_PR_TARGET_BRANCH
): Promise<string | undefined> {
  if (!owner || !repo || !prNumber) {
    return targetBranch;
  }

  const parsedNumber = typeof prNumber === 'number' ? prNumber : parseInt(prNumber, 10);

  if (!Number.isFinite(parsedNumber)) {
    return targetBranch;
  }

  try {
    const response = await getGithubClient().graphql<StackQueryResponse>(STACK_BASE_QUERY, {
      owner,
      repo,
      number: parsedNumber,
    });

    const stackBase = response?.repository?.pullRequest?.stack?.baseRefName;

    if (!stackBase) {
      return targetBranch;
    }

    if (stackBase !== targetBranch) {
      console.warn(
        `PR #${parsedNumber} is part of a stack based on "${stackBase}"; using it as the effective target branch (direct base: "${targetBranch}")`
      );
    }

    return stackBase;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Failed to resolve stacked PR base, falling back to "${targetBranch}": ${message}`
    );
    return targetBranch;
  }
}
