/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Run by the `evals-gate` GitHub workflow through `actions/github-script`, from a sparse checkout of
// this directory. Like `evals_gate_rules.ts`, it may only import Node built-ins and that module.
import Fs from 'node:fs';
import type { Octokit } from '@octokit/rest';
import type { EvalsDecisionSuite, GateState, SuiteDecision } from './evals_gate_rules.ts';
import {
  DRAFT_DESCRIPTION,
  EVALS_ACCEPT_REGRESSION_LABEL,
  EVALS_GATE_STATUS_CONTEXT,
  EVALS_BUILD_STATUS_CONTEXT,
  EVALS_SKIP_LABEL,
  combineDecisions,
  decideSuite,
  findReusableVerdict,
  getDecisionPathMatches,
  getSuiteRunLabels,
  getVerdictStatusContext,
  isEvalsStatusContext,
  isSuiteRunRequested,
  isSuiteSkipped,
  toVerdict,
} from './evals_gate_rules.ts';

const SUITES_PATH = '.buildkite/pipelines/evals/evals.suites.json';
const COMMENT_MARKER = '<!-- evals-gate-comment -->';
const ERROR_DESCRIPTION = 'Evals gate errored, not enforced (see the workflow logs)';
const MAX_LISTED_FILES = 20;
const GATED_BASE_BRANCH = 'main';
// GitHub truncates a comparison's file list at this many files.
const COMPARE_FILES_LIMIT = 300;
// GitHub lists at most this many files for a PR, even with pagination.
const PR_FILES_LIMIT = 3000;
const TOO_MANY_FILES_DESCRIPTION =
  'Evals gate not enforced: the PR changes more files than GitHub lists (3,000)';

export interface GatePullRequest {
  number: number;
  baseRef: string;
  headSha: string;
  draft: boolean;
  author: string;
  labels: string[];
}

/** The GitHub operations the gate needs; `createGateApi` implements them with Octokit. */
export interface GateApi {
  getPullRequest: (prNumber: number) => Promise<GatePullRequest>;
  findOpenPullRequestNumbers: (sha: string) => Promise<number[]>;
  /** The PR's changed files, or `undefined` when GitHub capped the list. */
  listChangedFiles: (prNumber: number) => Promise<string[] | undefined>;
  listCommitShas: (prNumber: number) => Promise<string[]>;
  getStatus: (
    sha: string,
    context: string
  ) => Promise<{ state: string; description: string | null } | undefined>;
  listFilesBetween: (baseSha: string, headSha: string) => Promise<string[] | undefined>;
  setStatus: (status: { sha: string; state: GateState; description: string }) => Promise<void>;
  findComment: (prNumber: number) => Promise<number | undefined>;
  upsertComment: (prNumber: number, commentId: number | undefined, body: string) => Promise<void>;
  deleteComment: (commentId: number) => Promise<void>;
}

interface GateCore {
  info: (message: string) => void;
  error: (message: string) => void;
  summary: {
    addRaw: (text: string, addEOL?: boolean) => GateCore['summary'];
    write: () => Promise<unknown>;
  };
}

export interface GateContext {
  eventName: string;
  repo: { owner: string; repo: string };
  payload: {
    pull_request?: { number: number; head?: { sha: string } };
    sha?: string;
    context?: string;
  };
}

type GitHubClient = Pick<Octokit, 'paginate' | 'rest'>;

const withRenames = (files: Array<{ filename: string; previous_filename?: string }>): string[] =>
  files.flatMap(({ filename, previous_filename: previousFilename }) =>
    previousFilename ? [filename, previousFilename] : [filename]
  );

/**
 * The gate's own comment among a PR's comments. Only a bot's comment counts, so a person quoting
 * the marker is never edited or deleted; any bot does, so it keeps working if the workflow moves
 * from GITHUB_TOKEN to an app token.
 */
export const findGateCommentId = (
  comments: ReadonlyArray<{ id: number; body?: string | null; user?: { type: string } | null }>
): number | undefined =>
  comments.find(({ body, user }) => user?.type === 'Bot' && body?.includes(COMMENT_MARKER))?.id;

/** Implements `GateApi` with the Octokit client `actions/github-script` provides. */
export const createGateApi = (
  github: GitHubClient,
  { owner, repo }: { owner: string; repo: string },
  targetUrl: string
): GateApi => ({
  getPullRequest: async (prNumber) => {
    const { data } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
    return {
      number: data.number,
      baseRef: data.base.ref,
      headSha: data.head.sha,
      draft: Boolean(data.draft),
      author: data.user?.login ?? '',
      labels: data.labels.map(({ name }) => name),
    };
  },
  findOpenPullRequestNumbers: async (sha) => {
    const { data } = await github.rest.repos.listPullRequestsAssociatedWithCommit({
      owner,
      repo,
      commit_sha: sha,
    });
    const associated = data.filter(({ state, head }) => state === 'open' && head.sha === sha);
    if (associated.length > 0) {
      return associated.map(({ number }) => number);
    }
    // Commits on fork branches aren't associated with the PR, so search by SHA instead.
    const { data: search } = await github.rest.search.issuesAndPullRequests({
      q: `repo:${owner}/${repo} is:pr is:open ${sha}`,
    });
    return search.items.map(({ number }) => number);
  },
  listChangedFiles: async (prNumber) => {
    const files = await github.paginate(github.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });
    return files.length >= PR_FILES_LIMIT ? undefined : withRenames(files);
  },
  listCommitShas: async (prNumber) =>
    (
      await github.paginate(github.rest.pulls.listCommits, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      })
    ).map(({ sha }) => sha),
  getStatus: async (sha, context) => {
    // The combined status holds the latest status per context, so a verdict can't be pushed off
    // the page by newer statuses the way it can in the full status history.
    const { data } = await github.rest.repos.getCombinedStatusForRef({
      owner,
      repo,
      ref: sha,
      per_page: 100,
    });
    return data.statuses.find((status) => status.context === context);
  },
  listFilesBetween: async (baseSha, headSha) => {
    const { data } = await github.rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${baseSha}...${headSha}`,
    });
    const files = data.files ?? [];
    return files.length >= COMPARE_FILES_LIMIT ? undefined : withRenames(files);
  },
  setStatus: async ({ sha, state, description }) => {
    await github.rest.repos.createCommitStatus({
      owner,
      repo,
      sha,
      state,
      context: EVALS_GATE_STATUS_CONTEXT,
      description,
      target_url: targetUrl,
    });
  },
  findComment: async (prNumber) => {
    const comments = await github.paginate(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    });
    return findGateCommentId(comments);
  },
  upsertComment: async (prNumber, commentId, body) => {
    if (commentId) {
      await github.rest.issues.updateComment({ owner, repo, comment_id: commentId, body });
    } else {
      await github.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
    }
  },
  deleteComment: async (commentId) => {
    await github.rest.issues.deleteComment({ owner, repo, comment_id: commentId });
  },
});

const readSuitesFromCheckout = (): EvalsDecisionSuite[] => {
  const { suites } = JSON.parse(Fs.readFileSync(SUITES_PATH, 'utf-8')) as {
    suites?: EvalsDecisionSuite[];
  };
  return Array.isArray(suites) ? suites : [];
};

interface SuiteReport {
  suite: EvalsDecisionSuite;
  files: string[];
  decision: SuiteDecision;
}

// File names come from the PR, so they must not be able to end the code span (and e.g. mention a
// team) or inject lines into the comment.
const toCodeSpan = (file: string): string => `\`${file.replace(/[`\r\n]/g, '')}\``;

const formatFileList = (files: string[]): string =>
  [
    ...files.slice(0, MAX_LISTED_FILES).map((file) => `- ${toCodeSpan(file)}`),
    ...(files.length > MAX_LISTED_FILES ? [`- …and ${files.length - MAX_LISTED_FILES} more`] : []),
  ].join('\n');

const formatSuiteSection = ({ suite, files }: SuiteReport): string =>
  [
    `**${suite.id}**: add \`${
      getSuiteRunLabels(suite)[0]
    }\` to run it, or \`${EVALS_SKIP_LABEL}\` to skip it.`,
    '',
    `<details><summary>${files.length} matching file(s)</summary>`,
    '',
    formatFileList(files),
    '',
    '</details>',
  ].join('\n');

const formatComment = (author: string, missing: SuiteReport[]): string =>
  [
    `@${author}, this PR changes code that eval suites depend on. Add a label for each suite below to record whether its evals should run:`,
    '',
    ...missing.map(formatSuiteSection),
    '',
    `\`${EVALS_SKIP_LABEL}\` skips every suite listed here. Suites with a regression gate block merging only on a large, significant drop of their gated metric, which \`${EVALS_ACCEPT_REGRESSION_LABEL}\` overrides.`,
    '',
    'This comment is removed once every suite has a decision.',
    '',
    COMMENT_MARKER,
  ].join('\n');

const formatSummary = (
  pr: GatePullRequest,
  { state, description }: { state: GateState; description: string },
  reports: SuiteReport[]
): string =>
  [
    `## Evals gate for #${pr.number}: ${state}`,
    '',
    description,
    '',
    ...reports.flatMap(({ suite, files, decision }) => [
      `### ${suite.id}`,
      '',
      decision.description,
      '',
      formatFileList(files),
      '',
    ]),
    ...(reports.length > 0
      ? [
          `Add a suite's run label (e.g. \`${
            getSuiteRunLabels(reports[0].suite)[0]
          }\`) to run it, \`${EVALS_SKIP_LABEL}\` to skip every suite, or \`${EVALS_ACCEPT_REGRESSION_LABEL}\` to accept a gated regression. A run label added after the PR's Kibana build step finished needs a new push or a \`/ci\` comment to start the evals.`,
        ]
      : []),
  ].join('\n');

// The build posts `kibana-evals` itself, so it settles even when a lost agent, a timeout or a
// failed bootstrap kept the post-comparison step from posting a verdict.
const isEvalsBuildFinished = async (api: GateApi, sha: string): Promise<boolean> => {
  const status = await api.getStatus(sha, EVALS_BUILD_STATUS_CONTEXT);
  return status !== undefined && status.state !== 'pending';
};

const evaluatePullRequest = async ({
  api,
  core,
  pr,
  suites,
}: {
  api: GateApi;
  core: GateCore;
  pr: GatePullRequest;
  suites: EvalsDecisionSuite[];
}): Promise<void> => {
  const commentId = await api.findComment(pr.number);

  if (pr.draft) {
    await api.setStatus({ sha: pr.headSha, state: 'success', description: DRAFT_DESCRIPTION });
    if (commentId) {
      await bestEffort(core, 'decision comment', () => api.deleteComment(commentId));
    }
    return;
  }

  const changedFiles = await api.listChangedFiles(pr.number);
  // A capped list may leave out decision paths, so fail open like any other infra limit.
  if (!changedFiles) {
    await api.setStatus({
      sha: pr.headSha,
      state: 'success',
      description: TOO_MANY_FILES_DESCRIPTION,
    });
    if (commentId) {
      await bestEffort(core, 'decision comment', () => api.deleteComment(commentId));
    }
    return;
  }
  const lookup = {
    listPullRequestCommitShas: () => api.listCommitShas(pr.number),
    getVerdict: async (sha: string, context: string) =>
      toVerdict(sha, await api.getStatus(sha, context)),
    listFilesBetween: api.listFilesBetween,
  };

  const reports: SuiteReport[] = [];
  for (const suite of suites) {
    const files = getDecisionPathMatches(changedFiles, suite);
    if (files.length === 0) {
      continue;
    }

    // A gated suite's head verdict is read even when skipped: a regression measured on the head
    // keeps blocking after a skip. Earlier verdicts only stand in for a run that was requested.
    const headVerdict = suite.regressionGate
      ? await lookup.getVerdict(pr.headSha, getVerdictStatusContext(suite.id))
      : undefined;
    const awaitsVerdict =
      suite.regressionGate !== undefined &&
      isSuiteRunRequested(pr.labels, suite) &&
      !isSuiteSkipped(pr.labels, suite);
    const verdict =
      headVerdict ??
      (awaitsVerdict
        ? await findReusableVerdict({ lookup, headSha: pr.headSha, suite })
        : undefined);
    // Only a pending verdict on the head proves the suite started there; a finished build without
    // one may have run other suites only (e.g. before the run label was added).
    const evalsBuildFinished =
      awaitsVerdict && headVerdict?.state === 'pending'
        ? await isEvalsBuildFinished(api, pr.headSha)
        : false;

    reports.push({
      suite,
      files,
      decision: decideSuite({
        suite,
        labels: pr.labels,
        verdict,
        headSha: pr.headSha,
        evalsBuildFinished,
      }),
    });
  }

  const combined = combineDecisions(reports.map(({ decision }) => decision));
  await api.setStatus({ sha: pr.headSha, ...combined });
  core.info(
    `evals gate for #${pr.number} (${pr.headSha}): ${combined.state} - ${combined.description}`
  );

  // The status is the verdict; the summary and comment only explain it. Their errors are logged
  // rather than thrown, so the fail-open catch below can't overwrite a failure with success.
  const missing = reports.filter(({ decision }) => decision.kind === 'missing');
  await bestEffort(core, 'job summary', () =>
    core.summary.addRaw(formatSummary(pr, combined, reports), true).write()
  );
  await bestEffort(core, 'decision comment', () =>
    missing.length > 0
      ? api.upsertComment(pr.number, commentId, formatComment(pr.author, missing))
      : commentId
      ? api.deleteComment(commentId)
      : Promise.resolve()
  );
};

const bestEffort = async (
  core: GateCore,
  what: string,
  action: () => Promise<unknown>
): Promise<void> => {
  try {
    await action();
  } catch (error) {
    core.error(`evals gate could not update the ${what}: ${String(error)}`);
  }
};

const resolvePullRequestNumbers = async (api: GateApi, context: GateContext): Promise<number[]> => {
  if (context.eventName === 'status') {
    const { sha, context: statusContext } = context.payload;
    if (!sha || !statusContext || !isEvalsStatusContext(statusContext)) {
      return [];
    }
    return api.findOpenPullRequestNumbers(sha);
  }
  const prNumber = context.payload.pull_request?.number;
  return prNumber ? [prNumber] : [];
};

/**
 * Posts the `evals gate` commit status: whether each eval suite whose `requireDecisionOnPaths` the
 * PR touches has a run or skip decision, and for gated suites, whether the run regressed. Errors
 * never block a PR: they post `success` marked as not enforced.
 */
export const runEvalsGate = async ({
  api,
  core,
  context,
  readSuites = readSuitesFromCheckout,
}: {
  api: GateApi;
  core: GateCore;
  context: GateContext;
  readSuites?: () => EvalsDecisionSuite[];
}): Promise<void> => {
  const eventSha =
    context.eventName === 'status' ? context.payload.sha : context.payload.pull_request?.head?.sha;
  // Fail open when even the PR can't be read: post on the event's commit, the best guess at its head.
  const failOpen = async (sha: string | undefined) => {
    if (sha) {
      await api.setStatus({ sha, state: 'success', description: ERROR_DESCRIPTION });
    }
  };

  let prNumbers: number[];
  try {
    prNumbers = await resolvePullRequestNumbers(api, context);
  } catch (error) {
    core.error(`evals gate could not find the PR: ${String(error)}`);
    await failOpen(eventSha);
    return;
  }

  for (const prNumber of prNumbers) {
    let headSha: string | undefined;
    try {
      const pr = await api.getPullRequest(prNumber);
      // The workflow's branch filter only covers PR events; a status event finds PRs by commit,
      // including backports. The baselines and suite config are main's, so only gate main.
      if (pr.baseRef !== GATED_BASE_BRANCH) {
        core.info(`Skipping #${prNumber}: it targets ${pr.baseRef}, not ${GATED_BASE_BRANCH}.`);
        continue;
      }
      // An event for an older commit runs in that commit's concurrency group, so evaluating the
      // new head here could race the head's own run with stale labels. The head's events cover it.
      if (eventSha && pr.headSha !== eventSha) {
        core.info(`Skipping #${prNumber}: the event is for ${eventSha}, not its head.`);
        continue;
      }
      headSha = pr.headSha;
      await evaluatePullRequest({ api, core, pr, suites: readSuites() });
    } catch (error) {
      core.error(`evals gate failed for #${prNumber}: ${String(error)}`);
      await failOpen(headSha ?? eventSha);
    }
  }
};

/** Entry point for `actions/github-script`. */
export const runEvalsGateWorkflow = async ({
  github,
  context,
  core,
}: {
  github: GitHubClient;
  context: GateContext & { serverUrl: string; runId: number };
  core: GateCore;
}): Promise<void> => {
  const { owner, repo } = context.repo;
  const targetUrl = `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`;
  await runEvalsGate({ api: createGateApi(github, context.repo, targetUrl), core, context });
};
