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
  EVALS_SKIP_LABEL,
  EVALS_VERDICT_STATUS_CONTEXT_PREFIX,
  combineDecisions,
  decideSuite,
  findReusableVerdict,
  getDecisionPathMatches,
  getSuiteRunLabels,
  getVerdictStatusContext,
  isSuiteRunRequested,
  isSuiteSkipped,
  toVerdict,
} from './evals_gate_rules.ts';

const SUITES_PATH = '.buildkite/pipelines/evals/evals.suites.json';
const COMMENT_MARKER = '<!-- evals-gate-comment -->';
const ERROR_DESCRIPTION = 'Evals gate errored, not enforced (see the workflow logs)';
const MAX_LISTED_FILES = 20;
// GitHub truncates a comparison's file list at this many files.
const COMPARE_FILES_LIMIT = 300;

export interface GatePullRequest {
  number: number;
  headSha: string;
  draft: boolean;
  author: string;
  labels: string[];
}

/** The GitHub operations the gate needs; `createGateApi` implements them with Octokit. */
export interface GateApi {
  getPullRequest: (prNumber: number) => Promise<GatePullRequest>;
  findOpenPullRequestNumbers: (sha: string) => Promise<number[]>;
  listChangedFiles: (prNumber: number) => Promise<string[]>;
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
    pull_request?: { number: number };
    sha?: string;
    context?: string;
  };
}

type GitHubClient = Pick<Octokit, 'paginate' | 'rest'>;

const withRenames = (files: Array<{ filename: string; previous_filename?: string }>): string[] =>
  files.flatMap(({ filename, previous_filename: previousFilename }) =>
    previousFilename ? [filename, previousFilename] : [filename]
  );

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
  listChangedFiles: async (prNumber) =>
    withRenames(
      await github.paginate(github.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      })
    ),
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
    const { data } = await github.rest.repos.listCommitStatusesForRef({
      owner,
      repo,
      ref: sha,
      per_page: 100,
    });
    return data.find((status) => status.context === context);
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
    return comments.find(({ body }) => body?.includes(COMMENT_MARKER))?.id;
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

const formatFileList = (files: string[]): string =>
  [
    ...files.slice(0, MAX_LISTED_FILES).map((file) => `- \`${file}\``),
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
          }\`) to run it, \`${EVALS_SKIP_LABEL}\` to skip every suite, or \`${EVALS_ACCEPT_REGRESSION_LABEL}\` to accept a gated regression. A run label added after CI finished needs a new push or a \`/ci\` comment to start the evals.`,
        ]
      : []),
  ].join('\n');

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
      await api.deleteComment(commentId);
    }
    return;
  }

  const changedFiles = await api.listChangedFiles(pr.number);
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

    const needsVerdict =
      suite.regressionGate !== undefined &&
      isSuiteRunRequested(pr.labels, suite) &&
      !isSuiteSkipped(pr.labels, suite);
    const verdict = needsVerdict
      ? (await lookup.getVerdict(pr.headSha, getVerdictStatusContext(suite.id))) ??
        (await findReusableVerdict({ lookup, headSha: pr.headSha, suite }))
      : undefined;

    reports.push({
      suite,
      files,
      decision: decideSuite({ suite, labels: pr.labels, verdict, headSha: pr.headSha }),
    });
  }

  const combined = combineDecisions(reports.map(({ decision }) => decision));
  await api.setStatus({ sha: pr.headSha, ...combined });
  core.info(
    `evals gate for #${pr.number} (${pr.headSha}): ${combined.state} - ${combined.description}`
  );
  await core.summary.addRaw(formatSummary(pr, combined, reports), true).write();

  const missing = reports.filter(({ decision }) => decision.kind === 'missing');
  if (missing.length > 0) {
    await api.upsertComment(pr.number, commentId, formatComment(pr.author, missing));
  } else if (commentId) {
    await api.deleteComment(commentId);
  }
};

const resolvePullRequestNumbers = async (api: GateApi, context: GateContext): Promise<number[]> => {
  if (context.eventName === 'status') {
    const { sha, context: statusContext } = context.payload;
    if (!sha || !statusContext?.startsWith(EVALS_VERDICT_STATUS_CONTEXT_PREFIX)) {
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
  const prNumbers = await resolvePullRequestNumbers(api, context);
  for (const prNumber of prNumbers) {
    let headSha: string | undefined;
    try {
      const pr = await api.getPullRequest(prNumber);
      headSha = pr.headSha;
      await evaluatePullRequest({ api, core, pr, suites: readSuites() });
    } catch (error) {
      core.error(`evals gate failed for #${prNumber}: ${String(error)}`);
      if (headSha) {
        await api.setStatus({ sha: headSha, state: 'success', description: ERROR_DESCRIPTION });
      }
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
