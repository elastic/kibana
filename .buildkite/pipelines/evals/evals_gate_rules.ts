/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Shared by the PR pipeline (Buildkite) and the `evals-gate` GitHub workflow, which loads it with
// `require()` from a sparse checkout. Keep it dependency-free (Node built-ins only) and free of
// TypeScript-only runtime syntax so Node can strip the types.
import Path from 'node:path';

export interface EvalsDecisionPaths {
  include: string[];
  exclude?: string[];
}

export interface EvalsRegressionGate {
  dataset: string;
  evaluator: string;
  minAbsoluteDrop: number;
  alpha: number;
  maxBaselineAgeDays: number;
}

export interface EvalsDecisionSuite {
  id: string;
  ciLabels?: string[];
  requireDecisionOnPaths?: EvalsDecisionPaths;
  regressionGate?: EvalsRegressionGate;
}

export const EVALS_ALL_LABEL = 'evals:all';
/** Skips every suite that requires an evals decision; other suites (e.g. smoke-tests) still run. */
export const EVALS_SKIP_LABEL = 'evals:skip';
/**
 * `evals:skip-<suite-id>` drops a suite even when its `evals:<suite-id>` label is present. Needed
 * because `.github/paths-labeller.yml` auto-applies `evals:smoke-tests` and re-adds it on every
 * push, so removing that label by hand doesn't stick.
 */
export const EVALS_SKIP_LABEL_PREFIX = 'evals:skip-';
export const EVALS_ACCEPT_REGRESSION_LABEL = 'evals:accept-regression';

/** Required commit status context posted by the `evals-gate` workflow. */
export const EVALS_GATE_STATUS_CONTEXT = 'evals gate';
export const EVALS_VERDICT_STATUS_CONTEXT_PREFIX = 'kibana-evals/';
/** Overall status of the `kibana-evals-pr-llm-evals` build, posted by Buildkite. */
export const EVALS_BUILD_STATUS_CONTEXT = 'kibana-evals';

/** Commit status contexts the `evals gate` reacts to. */
export const isEvalsStatusContext = (context: string): boolean =>
  context === EVALS_BUILD_STATUS_CONTEXT || context.startsWith(EVALS_VERDICT_STATUS_CONTEXT_PREFIX);

/** GitHub rejects commit status descriptions longer than this. */
export const STATUS_DESCRIPTION_MAX_LENGTH = 140;

export const NO_DECISION_REQUIRED_DESCRIPTION = 'No evals decision required for these changes';
export const DRAFT_DESCRIPTION = 'Draft PRs do not require an evals decision';

/** Commit status context carrying a suite's regression verdict. */
export const getVerdictStatusContext = (suiteId: string): string =>
  `${EVALS_VERDICT_STATUS_CONTEXT_PREFIX}${suiteId}`;

export const getSuiteRunLabels = ({ id, ciLabels }: EvalsDecisionSuite): string[] =>
  ciLabels?.length ? ciLabels : [`evals:${id}`];

export const matchesDecisionPaths = (
  file: string,
  { include, exclude = [] }: EvalsDecisionPaths
): boolean =>
  include.some((glob) => Path.matchesGlob(file, glob)) &&
  !exclude.some((glob) => Path.matchesGlob(file, glob));

/** The changed files that require an evals decision for the suite, sorted and de-duplicated. */
export const getDecisionPathMatches = (
  changedFiles: readonly string[],
  { requireDecisionOnPaths }: EvalsDecisionSuite
): string[] => {
  if (!requireDecisionOnPaths) {
    return [];
  }
  return [...new Set(changedFiles)]
    .filter((file) => matchesDecisionPaths(file, requireDecisionOnPaths))
    .sort();
};

/** `evals:skip` covers every suite that requires a decision; `evals:skip-<id>` covers one suite. */
export const isSuiteSkipped = (labels: readonly string[], suite: EvalsDecisionSuite): boolean =>
  labels.includes(`${EVALS_SKIP_LABEL_PREFIX}${suite.id}`) ||
  (suite.requireDecisionOnPaths !== undefined && labels.includes(EVALS_SKIP_LABEL));

export const isSuiteRunRequested = (
  labels: readonly string[],
  suite: EvalsDecisionSuite
): boolean =>
  labels.includes(EVALS_ALL_LABEL) ||
  getSuiteRunLabels(suite).some((label) => labels.includes(label));

export type EvalsVerdictState = 'pending' | 'success' | 'failure' | 'error';

export interface EvalsVerdict {
  state: EvalsVerdictState;
  description: string;
  sha: string;
}

const VERDICT_STATES: readonly string[] = ['pending', 'success', 'failure', 'error'];

const isVerdictState = (state: string): state is EvalsVerdictState =>
  VERDICT_STATES.includes(state);

/** A verdict from a GitHub commit status, or `undefined` when there is none. */
export const toVerdict = (
  sha: string,
  status: { state: string; description?: string | null } | undefined
): EvalsVerdict | undefined =>
  status && isVerdictState(status.state)
    ? { state: status.state, description: status.description ?? '', sha }
    : undefined;

export type SuiteDecisionKind =
  | 'missing'
  | 'skipped'
  | 'requested'
  | 'pending'
  | 'passed'
  | 'inconclusive'
  | 'regression'
  | 'accepted';

export type GateState = 'success' | 'failure' | 'pending';

export interface SuiteDecision {
  suiteId: string;
  kind: SuiteDecisionKind;
  state: GateState;
  description: string;
  /** The label that runs the suite (its first `ciLabels` entry), set when a decision is missing. */
  runLabel?: string;
}

const STATE_BY_KIND: Record<SuiteDecisionKind, GateState> = {
  missing: 'failure',
  skipped: 'success',
  requested: 'success',
  pending: 'pending',
  passed: 'success',
  inconclusive: 'success',
  regression: 'failure',
  accepted: 'success',
};

const toDecision = (
  suiteId: string,
  kind: SuiteDecisionKind,
  description: string
): SuiteDecision => ({ suiteId, kind, state: STATE_BY_KIND[kind], description });

const shortSha = (sha: string): string => sha.slice(0, 7);

const reusedSuffix = (verdict: EvalsVerdict, headSha: string): string =>
  verdict.sha === headSha ? '' : ` (from ${shortSha(verdict.sha)})`;

const regressionDecision = (
  id: string,
  labels: readonly string[],
  verdict: EvalsVerdict,
  headSha: string
): SuiteDecision =>
  labels.includes(EVALS_ACCEPT_REGRESSION_LABEL)
    ? toDecision(id, 'accepted', `${id} regression accepted (${EVALS_ACCEPT_REGRESSION_LABEL})`)
    : toDecision(
        id,
        'regression',
        `${id} regressed: ${verdict.description}${reusedSuffix(
          verdict,
          headSha
        )}. Fix or add ${EVALS_ACCEPT_REGRESSION_LABEL}`
      );

/**
 * The gate's decision for one suite whose decision paths the PR touches. `evalsBuildFinished` says
 * the head commit's `kibana-evals` build reached a terminal state, so a verdict that is still
 * missing will never arrive.
 */
export const decideSuite = ({
  suite,
  labels,
  verdict,
  headSha,
  evalsBuildFinished = false,
}: {
  suite: EvalsDecisionSuite;
  labels: readonly string[];
  verdict: EvalsVerdict | undefined;
  headSha: string;
  evalsBuildFinished?: boolean;
}): SuiteDecision => {
  const { id } = suite;

  // A regression measured on this very commit stands until it is fixed or accepted; skipping or
  // dropping the run label afterwards doesn't clear it.
  if (suite.regressionGate && verdict?.state === 'failure' && verdict.sha === headSha) {
    return regressionDecision(id, labels, verdict, headSha);
  }
  if (isSuiteSkipped(labels, suite)) {
    return toDecision(id, 'skipped', `Evals skipped: ${id}`);
  }
  if (!isSuiteRunRequested(labels, suite)) {
    const [runLabel] = getSuiteRunLabels(suite);
    return {
      ...toDecision(
        id,
        'missing',
        `Evals decision required: add ${runLabel} or ${EVALS_SKIP_LABEL}`
      ),
      runLabel,
    };
  }
  if (!suite.regressionGate) {
    return toDecision(id, 'requested', `${id}: evals requested`);
  }
  if (!verdict || verdict.state === 'pending') {
    return evalsBuildFinished
      ? toDecision(
          id,
          'inconclusive',
          `${id} inconclusive, not enforced: the eval build finished without a verdict`
        )
      : toDecision(
          id,
          'pending',
          `Waiting for ${id} eval results (push or comment /ci if the Kibana build already finished)`
        );
  }

  const suffix = reusedSuffix(verdict, headSha);
  if (verdict.state === 'success') {
    return toDecision(id, 'passed', `${id}: ${verdict.description}${suffix}`);
  }
  if (verdict.state === 'error') {
    return toDecision(
      id,
      'inconclusive',
      `${id} inconclusive, not enforced: ${verdict.description}${suffix}`
    );
  }
  return regressionDecision(id, labels, verdict, headSha);
};

export const truncateDescription = (description: string): string =>
  description.length <= STATUS_DESCRIPTION_MAX_LENGTH
    ? description
    : `${description.slice(0, STATUS_DESCRIPTION_MAX_LENGTH - 1)}…`;

/** Folds per-suite decisions into the single `evals gate` status. */
export const combineDecisions = (
  decisions: readonly SuiteDecision[]
): { state: GateState; description: string } => {
  if (decisions.length === 0) {
    return { state: 'success', description: NO_DECISION_REQUIRED_DESCRIPTION };
  }

  const state: GateState = decisions.some((decision) => decision.state === 'failure')
    ? 'failure'
    : decisions.some((decision) => decision.state === 'pending')
    ? 'pending'
    : 'success';
  const relevant = decisions.filter((decision) => decision.state === state);

  const missing = relevant.filter(({ kind }) => kind === 'missing');
  const skipped = relevant.filter(({ kind }) => kind === 'skipped');
  const others = relevant.filter(({ kind }) => kind !== 'missing' && kind !== 'skipped');

  const parts = [
    ...(missing.length > 1
      ? [
          `Evals decision required: add ${missing
            .map(({ suiteId, runLabel }) => runLabel ?? `evals:${suiteId}`)
            .join(', ')} or ${EVALS_SKIP_LABEL}`,
        ]
      : missing.map(({ description }) => description)),
    ...(skipped.length > 0
      ? [`Evals skipped: ${skipped.map(({ suiteId }) => suiteId).join(', ')}`]
      : []),
    ...others.map(({ description }) => description),
  ];

  return { state, description: truncateDescription(parts.join('; ')) };
};

/** GitHub lookups `findReusableVerdict` needs; each caller adapts its own Octokit client. */
export interface VerdictLookup {
  /** The PR's commit SHAs, oldest first. */
  listPullRequestCommitShas: () => Promise<string[]>;
  getVerdict: (sha: string, context: string) => Promise<EvalsVerdict | undefined>;
  /** Files changed from `baseSha` to `headSha`, or `undefined` when the list is incomplete. */
  listFilesBetween: (baseSha: string, headSha: string) => Promise<string[] | undefined>;
}

const MAX_VERDICT_LOOKBACK = 20;

/**
 * The newest passing verdict on an earlier PR commit, when nothing changed since then under the
 * suite's decision paths. Only passes are reused: a regression re-runs on the next commit so a noisy
 * result can clear, and the search stops there so an older pass behind it isn't picked up.
 * Inconclusive and pending verdicts are skipped over.
 */
export const findReusableVerdict = async ({
  lookup,
  headSha,
  suite,
}: {
  lookup: VerdictLookup;
  headSha: string;
  suite: EvalsDecisionSuite;
}): Promise<EvalsVerdict | undefined> => {
  const shas = await lookup.listPullRequestCommitShas();
  const headIndex = shas.indexOf(headSha);
  const earlier = (headIndex === -1 ? shas : shas.slice(0, headIndex))
    .filter((sha) => sha !== headSha)
    .reverse()
    .slice(0, MAX_VERDICT_LOOKBACK);
  const context = getVerdictStatusContext(suite.id);

  for (const sha of earlier) {
    const verdict = await lookup.getVerdict(sha, context);
    if (verdict?.state === 'failure') {
      return undefined;
    }
    if (verdict?.state !== 'success') {
      continue;
    }
    const files = await lookup.listFilesBetween(sha, headSha);
    if (!files || getDecisionPathMatches(files, suite).length > 0) {
      return undefined;
    }
    return verdict;
  }

  return undefined;
};
