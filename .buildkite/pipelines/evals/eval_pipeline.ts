/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import Fs from 'fs';
import Path from 'path';

const EVALS_SUITES_METADATA_RELATIVE_PATH = '.buildkite/pipelines/evals/evals.suites.json';

export interface EvalsSuiteMetadataEntry {
  id: string;
  name?: string;
  ciLabels?: string[];
  configPath?: string;
  serverConfigSet?: string;
  weeklyEisModelGroups?: string[];
  defaultModelGroups?: string[] | null;
}

function pathExistsInGitTree(repoRelativePath: string): boolean {
  // Non-zero exit = git failed (not "path absent"); let it throw so the caller can log it.
  const output = execFileSync('git', ['ls-tree', '--name-only', 'HEAD', repoRelativePath], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  return output.length > 0;
}

function readEvalsSuiteMetadata(): EvalsSuiteMetadataEntry[] {
  try {
    const filePath = Path.resolve(process.cwd(), EVALS_SUITES_METADATA_RELATIVE_PATH);
    const raw = Fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { suites?: EvalsSuiteMetadataEntry[] };
    const suites = Array.isArray(parsed.suites) ? parsed.suites : [];
    return suites.filter((suite) => {
      if (!suite?.configPath) return true;
      return pathExistsInGitTree(suite.configPath);
    });
  } catch (error) {
    // Best-effort: log and return no suites rather than abort generation. The parent then skips
    // the trigger; the child (same gate) turns an empty selection red (see evals_pr/pipeline.ts).
    console.error('Failed to read eval suite metadata:', error);
    return [];
  }
}

function normalizeBuildkiteKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseGithubPrLabels(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map(String)
        .map((label) => label.trim())
        .filter(Boolean);
    }
  } catch {
    // fall through
  }

  return raw
    .split(/[\n,]+/g)
    .map((label) => label.trim())
    .filter(Boolean);
}

/**
 * PR labels forwarded to `kibana-evals-pr-llm-evals`, minus any with whitespace or `=`: they ride
 * `trigger_pipeline.ts`'s `key=value` space-delimited transport, which a spaced (e.g. `good first
 * issue`) or `=`-bearing label would truncate — dropping the `evals:*`/`models:*` labels.
 */
export function getForwardablePrLabels(githubPrLabels: string): string {
  return parseGithubPrLabels(githubPrLabels)
    .filter((label) => !/[\s=]/.test(label))
    .join(',');
}

/**
 * Default weekly EIS models for suites without a `weeklyEisModelGroups` override, under
 * `models:weekly-eis-models`. Keep in sync with &weekly_eis_core_models in llm_evals.yml.
 */
const DEFAULT_WEEKLY_EIS_MODELS: string[] = [
  'eis/anthropic-claude-4.6-sonnet',
  'eis/anthropic-claude-4.6-opus',
  'eis/google-gemini-3.0-flash',
  'eis/google-gemini-3.1-pro',
  'eis/openai-gpt-5.4',
  'eis/openai-gpt-oss-120b',
];

const WEEKLY_EIS_MODELS_ALIAS = 'weekly-eis-models';

/**
 * Model-group aliases: one `models:<alias>` label expands to several model groups for the fanout.
 * `weekly-eis-models` is handled separately (resolved per-suite; see above).
 */
const MODEL_GROUP_ALIASES: Record<string, string[]> = {};

function normalizeEvaluationConnectorId(raw: string): string {
  // `models:judge:eis/<modelId>` — judge value is a model id, not a connector id.
  if (raw.startsWith('eis/')) {
    return `eis-${normalizeBuildkiteKey(raw.slice('eis/'.length))}`;
  }

  // `models:judge:<modelGroup>` (e.g. `llm-gateway/gpt-5.2`) — judge value is a model group.
  if (raw.includes('/')) {
    return `litellm-${normalizeBuildkiteKey(raw)}`;
  }

  // Already a connector id (e.g. `litellm-*` / `eis-*`).
  return raw;
}

/**
 * Whether heavy eval steps run on preemptible (spot) agents. Defaults to `true` (weekly/on-demand);
 * PR evals set `EVAL_PREEMPTIBLE=0` so a lost worker/timeout doesn't silently re-run the suite.
 */
function isPreemptibleEnabled(): boolean {
  const raw = (process.env.EVAL_PREEMPTIBLE ?? '').trim().toLowerCase();
  return !['0', 'false', 'no'].includes(raw);
}

/**
 * YAML double-quoted scalar with `$` escaped to `$$` so Buildkite upload won't interpolate it.
 */
function toBuildkiteYamlString(value: string): string {
  return JSON.stringify(value).replace(/\$/g, '$$$$');
}

function buildEvalsYaml({
  selectedSuites,
  resolveModelGroups,
  evaluationConnectorId,
  hasEisJudge,
}: {
  selectedSuites: EvalsSuiteMetadataEntry[];
  resolveModelGroups: (suite: EvalsSuiteMetadataEntry) => string[];
  evaluationConnectorId: string | undefined;
  hasEisJudge: boolean;
}): string {
  const preemptible = isPreemptibleEnabled();
  const suiteSteps = selectedSuites
    .map((suite) => {
      const key = `kbn-evals-${normalizeBuildkiteKey(suite.id)}`;
      const label = suite.name ? `Evals: ${suite.name}` : `Evals: ${suite.id}`;
      const suiteModelGroups = resolveModelGroups(suite);
      // Label-derived values cross a pipeline boundary; serialize as `$`-safe YAML.
      const modelGroupsEnv =
        suiteModelGroups.length > 0
          ? `          EVAL_MODEL_GROUPS: ${toBuildkiteYamlString(suiteModelGroups.join(','))}`
          : null;
      const evaluationConnectorIdEnv = evaluationConnectorId
        ? `          EVALUATION_CONNECTOR_ID: ${toBuildkiteYamlString(evaluationConnectorId)}`
        : null;
      const includeEisModels =
        hasEisJudge || suiteModelGroups.some((group) => group.startsWith('eis/'));
      const includeEisModelsEnv = includeEisModels
        ? `          EVAL_INCLUDE_EIS_MODELS: '1'`
        : null;
      const evalServerConfigSetEnv = suite.serverConfigSet
        ? `          EVAL_SERVER_CONFIG_SET: ${toBuildkiteYamlString(suite.serverConfigSet)}`
        : null;
      return [
        `      - label: ${toBuildkiteYamlString(label)}`,
        `        key: ${key}`,
        `        command: bash .buildkite/scripts/steps/evals/run_suite.sh`,
        `        env:`,
        `          KBN_EVALS: '1'`,
        `          FTR_EIS_CCM: '1'`,
        `          EVAL_SUITE_ID: ${toBuildkiteYamlString(suite.id)}`,
        `          EVAL_FANOUT: '1'`,
        ...(evaluationConnectorIdEnv ? [evaluationConnectorIdEnv] : []),
        ...(includeEisModelsEnv ? [includeEisModelsEnv] : []),
        ...(modelGroupsEnv ? [modelGroupsEnv] : []),
        ...(evalServerConfigSetEnv ? [evalServerConfigSetEnv] : []),
        `        timeout_in_minutes: 60`,
        `        agents:`,
        `          image: family/kibana-ubuntu-2404`,
        `          imageProject: elastic-images-prod`,
        `          provider: gcp`,
        `          machineType: n2-standard-8`,
        ...(preemptible ? [`          preemptible: true`] : []),
        `        retry:`,
        `          automatic:`,
        // Preemptible only: retry lost workers (-1). Dropped otherwise so a lost
        // worker/timeout doesn't silently re-run the whole suite.
        ...(preemptible ? [`            - exit_status: '-1'`, `              limit: 3`] : []),
        `            - exit_status: '*'`,
        `              limit: 1`,
      ].join('\n');
    })
    .join('\n');

  return [
    // `getPipeline()` strips `steps:` so fragments concatenate under one top-level `steps:`.
    `  - group: LLM Evals`,
    `    key: kibana-evals`,
    `    depends_on:`,
    `      - build`,
    `    steps:`,
    suiteSteps,
  ].join('\n');
}

interface EvalSelection {
  runnableSuites: EvalsSuiteMetadataEntry[];
  resolveModelGroups: (suite: EvalsSuiteMetadataEntry) => string[];
  evaluationConnectorId: string | undefined;
  hasEisJudge: boolean;
}

/**
 * Which suites/models run for the PR labels, or `null`. Shared by `getEvalPipeline` and
 * `getEvalTriggerStep` so the label gate lives in one place.
 */
function resolveEvalSelection(githubPrLabels: string): EvalSelection | null {
  const parsedLabels = parseGithubPrLabels(githubPrLabels);

  // Most PRs carry no eval labels; bail before reading suite metadata so we don't spawn a
  // `git ls-tree` per suite on every kibana-pull-request pipeline generation.
  if (!parsedLabels.some((label) => label.startsWith('evals:') || label.startsWith('models:'))) {
    return null;
  }

  // Run eval suite(s) when their GH label(s) are present (see `evals.suites.json`).
  const evalSuites = readEvalsSuiteMetadata();
  const runAllEvals = parsedLabels.includes('evals:all');
  const selectedEvalSuites = runAllEvals
    ? evalSuites
    : evalSuites.filter((suite) => {
        const labels = suite.ciLabels?.length ? suite.ciLabels : [`evals:${suite.id}`];
        return labels.some((label) => parsedLabels.includes(label));
      });
  // Model filtering (models:* labels): none => skip (explicit selection required);
  // `models:<group>` => run those groups; aliases (e.g. `models:weekly-eis-models`) expand.
  const rawEvaluationConnectorId = parsedLabels
    .find((label) => label.startsWith('models:judge:'))
    ?.slice('models:judge:'.length)
    ?.trim();
  const evaluationConnectorId = rawEvaluationConnectorId
    ? normalizeEvaluationConnectorId(rawEvaluationConnectorId)
    : undefined;

  // Extract model groups + expand aliases. `weekly-eis-models` resolves per-suite (see above).
  const rawModelSelectors = parsedLabels
    .filter((label) => label.startsWith('models:') && !label.startsWith('models:judge:'))
    .map((label) => label.slice('models:'.length))
    .map((value) => value.trim())
    .filter(Boolean);

  const useWeeklyEisModels = rawModelSelectors.includes(WEEKLY_EIS_MODELS_ALIAS);

  const explicitModelGroups = rawModelSelectors
    .filter((value) => value !== WEEKLY_EIS_MODELS_ALIAS)
    .flatMap((value) => MODEL_GROUP_ALIASES[value] ?? [value]);

  const hasGlobalModelSelection = explicitModelGroups.length > 0 || useWeeklyEisModels;

  const resolveModelGroups = (suite: EvalsSuiteMetadataEntry): string[] => {
    const weeklyModels = useWeeklyEisModels
      ? suite.weeklyEisModelGroups ?? DEFAULT_WEEKLY_EIS_MODELS
      : [];
    const resolved = [...new Set([...explicitModelGroups, ...weeklyModels])];
    if (resolved.length > 0) {
      return resolved;
    }
    return suite.defaultModelGroups ?? [];
  };

  const hasEisJudge =
    !!rawEvaluationConnectorId?.startsWith('eis/') || !!evaluationConnectorId?.startsWith('eis-');

  if (selectedEvalSuites.length === 0) {
    return null;
  }

  // Without models:* labels, skip (running all models is expensive) — except suites with
  // `defaultModelGroups`, which use their pinned defaults.
  const suitesWithDefaults = selectedEvalSuites.filter(
    (suite) => suite.defaultModelGroups && suite.defaultModelGroups.length > 0
  );
  if (!hasGlobalModelSelection && suitesWithDefaults.length === 0) {
    return null;
  }

  const runnableSuites = hasGlobalModelSelection ? selectedEvalSuites : suitesWithDefaults;

  return {
    runnableSuites,
    resolveModelGroups,
    evaluationConnectorId,
    hasEisJudge,
  };
}

/** Whether any eval suite should run for the given PR labels. */
export function shouldRunEvals(githubPrLabels: string): boolean {
  return resolveEvalSelection(githubPrLabels) !== null;
}

/** Buildkite YAML group for the eval suites matching the PR labels, or `null`. */
export function getEvalPipeline(githubPrLabels: string): string | null {
  const selection = resolveEvalSelection(githubPrLabels);
  if (!selection) {
    return null;
  }

  return buildEvalsYaml({
    selectedSuites: selection.runnableSuites,
    resolveModelGroups: selection.resolveModelGroups,
    evaluationConnectorId: selection.evaluationConnectorId,
    hasEisJudge: selection.hasEisJudge,
  });
}

/**
 * Command step (YAML fragment) that fires the dedicated `kibana-evals-pr-llm-evals` pipeline, or `null`.
 * Emitted by `kibana-pull-request` instead of the inline `LLM Evals` group. `trigger_pr_evals.sh`
 * creates the child build (forwarding PR context for fork checkout + `KIBANA_BUILD_ID` for artifact
 * reuse). Fire-and-forget: `depends_on: build` gates on the artifact, `soft_fail` keeps a trigger
 * hiccup off the PR.
 */
export function getEvalTriggerStep(githubPrLabels: string): string | null {
  // Gate on the SAME filtered set we forward, so the parent's decision matches what the child
  // re-selects from (a spaced/`=` selection label can't pass here yet vanish before the child).
  const forwardableLabels = getForwardablePrLabels(githubPrLabels);
  if (!shouldRunEvals(forwardableLabels)) {
    return null;
  }

  // Escaped since raw labels are hostile YAML input; see getForwardablePrLabels for the filtering.
  const forwardLabelsEnv = toBuildkiteYamlString(forwardableLabels);

  return [
    // `getPipeline()` strips `steps:` so fragments concatenate under one top-level `steps:`.
    `  - label: ':robot_face: Trigger LLM Evals'`,
    `    key: kibana-evals-trigger`,
    `    depends_on:`,
    `      - build`,
    `    command: bash .buildkite/scripts/steps/evals/trigger_pr_evals.sh`,
    `    env:`,
    `      GITHUB_PR_LABELS: ${forwardLabelsEnv}`,
    `    timeout_in_minutes: 10`,
    `    soft_fail: true`,
    `    agents:`,
    `      image: family/kibana-ubuntu-2404`,
    `      imageProject: elastic-images-prod`,
    `      provider: gcp`,
    `      machineType: n2-standard-2`,
    `    retry:`,
    `      automatic:`,
    `        - exit_status: '*'`,
    `          limit: 1`,
  ].join('\n');
}
