/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Helpers for pr.mjs: the `gh` wrappers, argument parsing, and the checks that read Libra's and CI's state.
 */

import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const REPO = 'elastic/kibana';
export const [OWNER, NAME] = REPO.split('/');
export const LIBRA_LOGIN = 'infra-vault-gh-plugin-prod';
export const POLL_INTERVAL_MS = 30_000;
export const DEFAULT_WAIT_SECONDS = 300;
const GH_ATTEMPTS = 3;

// How long after a signal was first watched (see getFirstSeen) it may stay silent before it's reported as `none`, and how long
// it may stay pending before it's reported as `timeout`. Libra starts within a minute or two; a full CI build
// takes about an hour.
export const LIBRA_TIMING = { startupMs: 5 * 60_000, timeoutMs: 20 * 60_000, label: 'Libra' };
export const CI_TIMING = { startupMs: 15 * 60_000, timeoutMs: 2 * 60 * 60_000, label: 'kibana-ci' };

export const THREADS_QUERY = `
  query($owner: String!, $repo: String!, $pr: Int!, $endCursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 100, after: $endCursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            isResolved
            isOutdated
            path
            line
            opener: comments(first: 1) {
              nodes { databaseId url body author { login __typename } }
            }
            comments(first: 100) { nodes { author { login __typename } } }
            latest: comments(last: 1) { nodes { databaseId body author { login __typename } } }
          }
        }
      }
    }
  }`;

export const RESOLVE_MUTATION =
  'mutation($id: ID!) { resolveReviewThread(input: { threadId: $id }) { thread { isResolved } } }';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fail = (message) => {
  console.error(`pr.mjs: ${message}`);
  process.exit(2);
};

/** Runs `gh` and returns stdout. Retries transient failures, then throws with gh's own message. */
const gh = async (args) => {
  let lastError;
  for (let attempt = 1; attempt <= GH_ATTEMPTS; attempt++) {
    try {
      const { stdout } = await execFileAsync('gh', args, {
        env: { ...process.env, GH_PAGER: 'cat' },
        maxBuffer: 64 * 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      lastError = error;
      if (attempt < GH_ATTEMPTS) await sleep(attempt * 2000);
    }
  }
  const stderr = (lastError.stderr ?? '').toString().trim();
  throw new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${stderr || lastError.message}`);
};

export const ghJson = async (args) => JSON.parse(await gh(args));

/** Fetches every page of a list endpoint and returns the pages as an array. */
const ghPages = async (endpoint) =>
  ghJson(['api', endpoint, '--paginate', '--slurp', '-X', 'GET']);

export const parseOptions = (args, allowed) => {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!allowed.includes(flag) || args[i + 1] === undefined) fail(`unknown or incomplete option: ${flag}`);
    options[flag.slice(2)] = args[i + 1];
  }
  return options;
};

export const requirePr = (value, command) => {
  if (!/^\d+$/.test(value ?? '')) fail(`${command} requires a PR number`);
  return value;
};

export const formatLine = (signal, { state, sha, detail, extra }) =>
  `${signal}=${state} sha=${sha} detail="${detail}"${extra ? ` ${extra}` : ''}`;

// GraphQL drops the `[bot]` suffix that REST shows; the type check keeps user accounts with the same name out.
export const isLibra = (author) => author?.__typename === 'Bot' && author.login === LIBRA_LOGIN;

/**
 * Returns when `wait` first watched this signal, persisted in a temp file so repeated calls share one clock.
 * The commit date can't serve here: a commit made yesterday may be pushed, or its draft marked ready, today.
 */
export const getFirstSeen = (pr, key) => {
  const file = join(tmpdir(), `pr-babysit-${pr}.json`);
  let seen = {};
  try {
    seen = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    // No state yet, or it is unreadable: start the clock now.
  }
  if (!(key in seen)) {
    seen[key] = Date.now();
    try {
      writeFileSync(file, JSON.stringify(seen));
    } catch {
      // Without a writable temp dir the clock restarts on every call; waiting longer is the safe failure.
    }
  }
  return seen[key];
};

export const getHeadSha = async (pr) => {
  const { head } = await ghJson(['api', `repos/${REPO}/pulls/${pr}`, '--jq', '{head: .head.sha}']);
  return head;
};

const getCombinedStatuses = async (sha) => {
  const pages = await ghPages(`repos/${REPO}/commits/${sha}/status?per_page=100`);
  return pages.flatMap((page) => page.statuses);
};

export const getDefaultSha = async (pr) => {
  // kibanamachine fix-up commits aren't reviewed by Libra, so the PR head can be a commit that never gets a review.
  const pages = await ghPages(`repos/${REPO}/pulls/${pr}/commits?per_page=100`);
  const reviewable = pages.flat().filter((commit) => commit.author?.login !== 'kibanamachine');
  if (reviewable.length === 0) fail(`no commit on PR ${pr} that a reviewer would review`);
  return reviewable.at(-1).sha;
};

// Each check returns { state, detail, extra? } once the signal has a result, `missing` while nothing has been
// reported yet, or `pending` while a result is on its way.

export const checkLibra = async (sha) => {
  // The combined status keeps only the newest status per context.
  const status = (await getCombinedStatuses(sha)).find(({ context }) => context === 'Libra');
  if (!status) return { state: 'missing' };
  const detail = status.description ?? '';
  switch (status.state) {
    case 'success':
      if (/noop|no reported findings/i.test(detail)) return { state: 'clean', detail };
      if (/skipped/i.test(detail)) return { state: 'skipped', detail };
      return { state: 'findings', detail };
    case 'failure':
    case 'error':
      return { state: 'error', detail };
    default:
      return { state: 'pending' };
  }
};

export const checkCi = async (head, sinceMs) => {
  const status = (await getCombinedStatuses(head)).find(({ context }) => context === 'kibana-ci');
  if (!status) return { state: 'missing' };
  // A retry doesn't clear the old status, so until the new attempt reports, the status still describes the old one.
  if (sinceMs !== null && Date.parse(status.updated_at) < sinceMs) return { state: 'pending' };
  const extra = `url=${status.target_url ?? '-'}`;
  switch (status.state) {
    case 'success':
      return { state: 'passed', detail: 'build passed', extra };
    case 'failure':
    case 'error':
      return { state: 'failed', detail: `build ${status.state}`, extra };
    default:
      return { state: 'pending' };
  }
};

/** Turns a check result into a final result, or undefined while the signal should keep being polled. */
export const settle = (result, { sinceMs, startupMs, timeoutMs, label }) => {
  const age = Date.now() - sinceMs;
  if (result.state === 'missing') {
    return age >= startupMs
      ? { state: 'none', detail: `no ${label} result ${Math.round(startupMs / 1000)}s after it was first watched` }
      : undefined;
  }
  if (result.state === 'pending') {
    return age >= timeoutMs
      ? { state: 'timeout', detail: `no ${label} result ${Math.round(timeoutMs / 1000)}s after it was first watched` }
      : undefined;
  }
  return result;
};
