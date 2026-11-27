/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Drives an elastic/kibana PR through review and CI rounds. Talks to GitHub through the `gh` CLI; the
 * helpers live in helpers.mjs.
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
 *          none and timeout are measured from when wait first watched the signal, kept in a temp file, so
 *          they stay correct across repeated calls. --timeout 0 polls once.
 * threads  Prints one JSON object per unresolved thread opened by Libra whose latest comment is Libra's.
 *          followUp is true when Libra is answering a reply; otherReplies counts the non-Libra comments in the
 *          thread, and latestCommentId/latestBody hold Libra's answer.
 * resolve  Marks a review thread as resolved and prints the new isResolved value.
 */

import {
  CI_TIMING,
  DEFAULT_WAIT_SECONDS,
  LIBRA_TIMING,
  NAME,
  OWNER,
  POLL_INTERVAL_MS,
  REPO,
  RESOLVE_MUTATION,
  THREADS_QUERY,
  checkCi,
  checkLibra,
  fail,
  formatLine,
  getFirstSeen,
  getDefaultSha,
  getHeadSha,
  ghJson,
  isLibra,
  parseOptions,
  requirePr,
  settle,
  sleep,
} from './helpers.mjs';

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
  const libraSinceMs = libraSha ? getFirstSeen(pr, `libra:${libraSha}`) : null;

  const results = new Map();
  let ciHead = null;

  for (;;) {
    if (wanted.has('libra') && !results.has('libra')) {
      const final = settle(await checkLibra(libraSha), { ...LIBRA_TIMING, sinceMs: libraSinceMs });
      if (final) results.set('libra', { ...final, sha: libraSha });
    }

    if (wanted.has('ci')) {
      // Keep following the head until the call ends: a kibanamachine push after CI finished makes the stored
      // result describe a commit that is no longer the head.
      const head = await getHeadSha(pr);
      if (head !== ciHead) {
        ciHead = head;
        results.delete('ci');
      }
      if (!results.has('ci')) {
        const final = settle(await checkCi(head, sinceMs), {
          ...CI_TIMING,
          sinceMs: getFirstSeen(pr, `ci:${head}:${options.since ?? ''}`),
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

const threads = async (pr) => {
  const pages = await ghJson([
    'api', 'graphql', '--paginate', '--slurp',
    '-F', `owner=${OWNER}`, '-F', `repo=${NAME}`, '-F', `pr=${pr}`,
    '-f', `query=${THREADS_QUERY}`,
  ]);

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
  const result = await ghJson(['api', 'graphql', '-F', `id=${threadId}`, '-f', `query=${RESOLVE_MUTATION}`]);
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
