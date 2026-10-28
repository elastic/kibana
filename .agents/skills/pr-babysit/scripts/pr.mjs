/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Helpers for driving an elastic/kibana PR through review and CI rounds. Talks to GitHub through the `gh` CLI.
 *
 * Usage:
 *   node .agents/skills/pr-babysit/scripts/pr.mjs signals <pr>
 *   node .agents/skills/pr-babysit/scripts/pr.mjs wait <pr> --for <libra,ci> [--sha <sha>] [--since <utc>] [--timeout <seconds>]
 *   node .agents/skills/pr-babysit/scripts/pr.mjs threads <pr>
 *   node .agents/skills/pr-babysit/scripts/pr.mjs resolve <thread-id>
 *
 * signals  Prints which signals will act on the PR and whether it merges cleanly:
 *            libra=<on|off> [reason="…"]
 *            ci=<on|off> [reason="…"]
 *            mergeable=<MERGEABLE|CONFLICTING|UNKNOWN> base=<branch> head=<branch>
 * wait     Polls until every requested signal has a result or the call's time budget (default 300s) runs out,
 *          then prints one line per signal:
 *            libra=<clean|findings|skipped|error|none|timeout|pending> sha=<sha> detail="…"
 *            ci=<passed|failed|none|timeout|pending> sha=<sha> detail="…" [url=<build-url>]
 *          pending means the budget ran out first: call wait again with the same arguments.
 *          --sha defaults to the newest PR commit not pushed by kibanamachine and applies to libra; ci always
 *          follows the PR head, because kibanamachine fix-up commits restart CI.
 *          --since (UTC, e.g. 2026-10-02T10:00:00Z) makes ci ignore a status last updated before that time,
 *          so a wait after a retry doesn't return the failure that was retried.
 *          none and timeout are measured from the commit's date (or --since for ci), so they stay correct
 *          across repeated calls. --timeout 0 polls once.
 * threads  Prints one JSON object per unresolved thread opened by Libra whose latest comment is Libra's.
 *          followUp is true when Libra is answering a reply; otherReplies counts the non-Libra comments in the
 *          thread, and latestCommentId/latestBody hold Libra's answer.
 * resolve  Marks a review thread as resolved and prints the new isResolved value.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const REPO = 'elastic/kibana';
const [OWNER, NAME] = REPO.split('/');
const LIBRA_LOGIN = 'infra-vault-gh-plugin-prod';
const POLL_INTERVAL_MS = 30_000;
const DEFAULT_WAIT_SECONDS = 300;
const GH_ATTEMPTS = 3;

// How long after the commit (or --since) a signal may stay silent before it's reported as `none`, and how long
// it may stay pending before it's reported as `timeout`. Libra starts within a minute or two; a full CI build
// takes about an hour.
const LIBRA_STARTUP_MS = 5 * 60_000;
const LIBRA_TIMEOUT_MS = 20 * 60_000;
const CI_STARTUP_MS = 15 * 60_000;
const CI_TIMEOUT_MS = 2 * 60 * 60_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fail = (message) => {
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

const ghJson = async (args) => JSON.parse(await gh(args));

/** Fetches every page of a list endpoint and returns the pages as an array. */
const ghPages = async (endpoint) =>
  ghJson(['api', endpoint, '--paginate', '--slurp', '-X', 'GET']);

const parseOptions = (args, allowed) => {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!allowed.includes(flag) || args[i + 1] === undefined) fail(`unknown or incomplete option: ${flag}`);
    options[flag.slice(2)] = args[i + 1];
  }
  return options;
};

const requirePr = (value, command) => {
  if (!/^\d+$/.test(value ?? '')) fail(`${command} requires a PR number`);
  return value;
};

const formatLine = (signal, { state, sha, detail, extra }) =>
  `${signal}=${state} sha=${sha} detail="${detail}"${extra ? ` ${extra}` : ''}`;

const commitDates = new Map();
const getCommitDate = async (sha) => {
  if (!commitDates.has(sha)) {
    const commit = await ghJson(['api', `repos/${REPO}/commits/${sha}`]);
    commitDates.set(sha, Date.parse(commit.commit.committer.date));
  }
  return commitDates.get(sha);
};

const getCombinedStatuses = async (sha) => {
  const pages = await ghPages(`repos/${REPO}/commits/${sha}/status?per_page=100`);
  return pages.flatMap((page) => page.statuses);
};

const getDefaultSha = async (pr) => {
  // kibanamachine fix-up commits aren't reviewed by Libra, so the PR head can be a commit that never gets a review.
  const pages = await ghPages(`repos/${REPO}/pulls/${pr}/commits?per_page=100`);
  const reviewable = pages.flat().filter((commit) => commit.author?.login !== 'kibanamachine');
  if (reviewable.length === 0) fail(`no commit on PR ${pr} that a reviewer would review`);
  return reviewable.at(-1).sha;
};

const signals = async (pr) => {
  const view = await ghJson([
    'pr', 'view', pr, '-R', REPO, '--json', 'isDraft,labels,mergeable,baseRefName,headRefName',
  ]);
  const labels = new Set(view.labels.map(({ name }) => name));
  const line = (name, offReason) =>
    offReason ? `${name}=off reason="${offReason}"` : `${name}=on`;

  const libraOff = labels.has('reviewer:skip-ai')
    ? 'reviewer:skip-ai label'
    : view.isDraft && !labels.has('ci:draft-checks') && 'draft without ci:draft-checks';
  const ciOff = labels.has('skip-ci')
    ? 'skip-ci label'
    : view.isDraft && !labels.has('ci:build-draft') && 'draft without ci:build-draft';

  console.log(line('libra', libraOff));
  console.log(line('ci', ciOff));
  console.log(`mergeable=${view.mergeable} base=${view.baseRefName} head=${view.headRefName}`);
};

// Each check returns { state, detail, extra? } once the signal has a result, `missing` while nothing has been
// reported yet, or `pending` while a result is on its way.

const checkLibra = async (sha) => {
  // The combined status keeps only the newest status per context.
  const status = (await getCombinedStatuses(sha)).find(({ context }) => context === 'Libra');
  if (!status) return { state: 'missing' };
  const detail = status.description ?? '';
  switch (status.state) {
    case 'success':
      if (detail.includes('noop')) return { state: 'clean', detail };
      if (/skipped/i.test(detail)) return { state: 'skipped', detail };
      return { state: 'findings', detail };
    case 'failure':
    case 'error':
      return { state: 'error', detail };
    default:
      return { state: 'pending' };
  }
};

const checkCi = async (head, sinceMs) => {
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
const settle = (result, { sinceMs, startupMs, timeoutMs, label }) => {
  const age = Date.now() - sinceMs;
  if (result.state === 'missing') {
    return age >= startupMs
      ? { state: 'none', detail: `no ${label} result ${Math.round(startupMs / 1000)}s after the commit` }
      : undefined;
  }
  if (result.state === 'pending') {
    return age >= timeoutMs
      ? { state: 'timeout', detail: `no ${label} result ${Math.round(timeoutMs / 1000)}s after the commit` }
      : undefined;
  }
  return result;
};

const wait = async (pr, rest) => {
  const options = parseOptions(rest, ['--for', '--sha', '--since', '--timeout']);
  if (!options.for) fail('wait requires --for <libra,ci>');
  const wanted = new Set(options.for.split(','));
  for (const signal of wanted) if (!['libra', 'ci'].includes(signal)) fail(`unknown signal: ${signal}`);

  const budgetSeconds = options.timeout === undefined ? DEFAULT_WAIT_SECONDS : Number(options.timeout);
  if (!Number.isFinite(budgetSeconds) || budgetSeconds < 0) fail(`invalid --timeout: ${options.timeout}`);
  const deadline = Date.now() + budgetSeconds * 1000;

  const sinceMs = options.since ? Date.parse(options.since) : null;
  if (options.since && Number.isNaN(sinceMs)) fail(`invalid --since: ${options.since}`);

  const libraSha = wanted.has('libra') ? options.sha ?? (await getDefaultSha(pr)) : null;
  const libraSinceMs = libraSha ? await getCommitDate(libraSha) : null;

  const results = new Map();
  let ciHead = null;

  for (;;) {
    if (wanted.has('libra') && !results.has('libra')) {
      const final = settle(await checkLibra(libraSha), {
        sinceMs: libraSinceMs, startupMs: LIBRA_STARTUP_MS, timeoutMs: LIBRA_TIMEOUT_MS, label: 'Libra',
      });
      if (final) results.set('libra', { ...final, sha: libraSha });
    }

    if (wanted.has('ci')) {
      // Keep following the head until the call ends: a kibanamachine push after CI finished makes the stored
      // result describe a commit that is no longer the head.
      const { head } = await ghJson(['api', `repos/${REPO}/pulls/${pr}`, '--jq', '{head: .head.sha}']);
      if (head !== ciHead) {
        ciHead = head;
        results.delete('ci');
      }
      if (!results.has('ci')) {
        const headDate = await getCommitDate(head);
        const final = settle(await checkCi(head, sinceMs), {
          sinceMs: Math.max(headDate, sinceMs ?? 0),
          startupMs: CI_STARTUP_MS, timeoutMs: CI_TIMEOUT_MS, label: 'kibana-ci',
        });
        if (final) results.set('ci', { ...final, sha: head });
      }
    }

    const done = [...wanted].every((signal) => results.has(signal));
    if (done || Date.now() + POLL_INTERVAL_MS > deadline) break;
    await sleep(POLL_INTERVAL_MS);
  }

  for (const signal of ['libra', 'ci']) {
    if (!wanted.has(signal)) continue;
    const sha = signal === 'libra' ? libraSha : ciHead;
    console.log(formatLine(signal, results.get(signal) ?? { state: 'pending', sha, detail: 'no result yet' }));
  }
};

const THREADS_QUERY = `
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

const threads = async (pr) => {
  const pages = await ghJson([
    'api', 'graphql', '--paginate', '--slurp',
    '-F', `owner=${OWNER}`, '-F', `repo=${NAME}`, '-F', `pr=${pr}`,
    '-f', `query=${THREADS_QUERY}`,
  ]);
  // GraphQL drops the `[bot]` suffix that REST shows; the type check keeps user accounts with the same name out.
  const isLibra = (author) => author?.__typename === 'Bot' && author.login === LIBRA_LOGIN;

  for (const page of pages) {
    for (const thread of page.data.repository.pullRequest.reviewThreads.nodes) {
      const [opener] = thread.opener.nodes;
      const [latest] = thread.latest.nodes;
      if (thread.isResolved || !isLibra(opener?.author) || !isLibra(latest?.author)) continue;

      const otherReplies = thread.comments.nodes.filter(({ author }) => !isLibra(author)).length;
      console.log(
        JSON.stringify({
          reviewer: 'libra',
          threadId: thread.id,
          commentId: opener.databaseId,
          path: thread.path,
          line: thread.line,
          isOutdated: thread.isOutdated,
          url: opener.url,
          body: opener.body,
          followUp: otherReplies > 0,
          otherReplies,
          ...(otherReplies > 0 && { latestCommentId: latest.databaseId, latestBody: latest.body }),
        })
      );
    }
  }
};

const resolveThread = async (threadId) => {
  const result = await ghJson([
    'api', 'graphql', '-F', `id=${threadId}`,
    '-f', 'query=mutation($id: ID!) { resolveReviewThread(input: { threadId: $id }) { thread { isResolved } } }',
  ]);
  console.log(result.data.resolveReviewThread.thread.isResolved);
};

const main = async () => {
  const [command, target, ...rest] = process.argv.slice(2);
  switch (command) {
    case 'signals':
      return signals(requirePr(target, 'signals'));
    case 'wait':
      return wait(requirePr(target, 'wait'), rest);
    case 'threads':
      return threads(requirePr(target, 'threads'));
    case 'resolve':
      if (!target) fail('resolve requires a thread id');
      return resolveThread(target);
    default:
      return fail('usage: pr.mjs <signals|wait|threads|resolve> ...');
  }
};

main().catch((error) => fail(error.message));
