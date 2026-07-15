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
  defaultModelGroups?: string[];
}

function pathExistsInGitTree(repoRelativePath: string): boolean {
  try {
    const output = execFileSync('git', ['ls-tree', '--name-only', 'HEAD', repoRelativePath], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return output.length > 0;
  } catch {
    return false;
  }
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
  } catch {
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
 * Default weekly EIS model set (core tier). Suites without a `weeklyEisModelGroups`
 * override in evals.suites.json use this set when `models:weekly-eis-models` is applied.
 *
 * Keep in sync with &weekly_eis_core_models in llm_evals.yml.
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
 * Named model group aliases. These allow a single label (e.g. `models:<alias>`)
 * to expand into multiple individual model groups for the eval fanout.
 *
 * NOTE: `weekly-eis-models` is handled separately — it resolves per-suite via
 * `weeklyEisModelGroups` in evals.suites.json, falling back to DEFAULT_WEEKLY_EIS_MODELS.
 */
const MODEL_GROUP_ALIASES: Record<string, string[]> = {};

function normalizeEvaluationConnectorId(raw: string): string {
  // Support `models:judge:eis/<modelId>` where the judge value is a model id, not a connector id.
  if (raw.startsWith('eis/')) {
    return `eis-${normalizeBuildkiteKey(raw.slice('eis/'.length))}`;
  }

  // Support `models:judge:<modelGroup>` (e.g. `llm-gateway/gpt-5.2`) where the judge value is a model group.
  if (raw.includes('/')) {
    return `litellm-${normalizeBuildkiteKey(raw)}`;
  }

  // Already a connector id (e.g. `litellm-*` / `eis-*`) or some other explicit id.
  return raw;
}

/**
 * Whether heavy eval steps should run on preemptible (spot) agents.
 *
 * Defaults to `true` so the weekly/on-demand eval paths keep their spot-agent
 * behavior. The dedicated PR evals pipeline sets `EVAL_PREEMPTIBLE=0` so a lost
 * spot worker or timeout no longer silently re-runs the whole suite.
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
      // Model groups and the judge connector id derive from PR labels that cross a pipeline
      // boundary, so serialize them (and the other interpolated values) as `$`-safe YAML.
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
        // On preemptible (spot) agents, retry lost workers (exit_status -1). On
        // non-preemptible agents this retry is dropped so a lost worker/timeout
        // does not silently re-run the whole suite.
        ...(preemptible ? [`            - exit_status: '-1'`, `              limit: 3`] : []),
        `            - exit_status: '*'`,
        `              limit: 1`,
      ].join('\n');
    })
    .join('\n');

  return [
    // NOTE: `getPipeline()` strips `steps:` from YAML fragments so they can be concatenated
    // under the single top-level `steps:` key. This must follow that convention.
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
 * Computes which suites/models should run from the PR labels, or `null` when none should.
 * Shared by `getEvalPipeline` and `getEvalTriggerStep` so the label gate is defined once.
 */
function resolveEvalSelection(githubPrLabels: string): EvalSelection | null {
  const parsedLabels = parseGithubPrLabels(githubPrLabels);

  // Run eval suite(s) when their GH label(s) are present (see `evals.suites.json`).
  const evalSuites = readEvalsSuiteMetadata();
  const runAllEvals = parsedLabels.includes('evals:all');
  const selectedEvalSuites = runAllEvals
    ? evalSuites
    : evalSuites.filter((suite) => {
        const labels = suite.ciLabels?.length ? suite.ciLabels : [`evals:${suite.id}`];
        return labels.some((label) => parsedLabels.includes(label));
      });
  // Model filtering for eval fanout (models:* labels).
  // - No `models:*` labels => evals are skipped (explicit model selection is required).
  // - One or more `models:<model-group>` labels => only run connectors whose `defaultModel`
  //   matches one of those model groups.
  // - Alias labels (e.g. `models:weekly-eis-models`) expand to their predefined model groups.
  const rawEvaluationConnectorId = parsedLabels
    .find((label) => label.startsWith('models:judge:'))
    ?.slice('models:judge:'.length)
    ?.trim();
  const evaluationConnectorId = rawEvaluationConnectorId
    ? normalizeEvaluationConnectorId(rawEvaluationConnectorId)
    : undefined;

  // Extract model groups from labels and expand any aliases.
  // `weekly-eis-models` is handled separately — it resolves per-suite via
  // `weeklyEisModelGroups` in evals.suites.json with DEFAULT_WEEKLY_EIS_MODELS fallback.
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

  // Require explicit model selection — without models:* labels, evals are skipped
  // to avoid accidentally running against all models (which is expensive).
  // Suites with `defaultModelGroups` in evals.suites.json are exempt: they use
  // their pinned defaults when no models:* labels are present.
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

/**
 * Reads evals suite metadata and PR labels, then returns a Buildkite YAML group
 * for the matching eval suites.
 */
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
 * Command step (YAML fragment) that hands the eval run to the dedicated `kibana-evals-pr`
 * pipeline, or `null` when no evals should run. Emitted by `kibana-pull-request` instead of the
 * inline `LLM Evals` group. `trigger_pr_evals.sh` creates the child build via `trigger_pipeline.ts`
 * (forwarding full PR context so fork PRs check out `refs/pull/<N>/head`, and `KIBANA_BUILD_ID` so
 * the PR artifact is reused). The trigger is fire-and-forget, so eval runtime is off the PR's
 * critical path; `depends_on: build` ensures the artifact exists first and `soft_fail` keeps a
 * trigger hiccup from failing the PR.
 */
export function getEvalTriggerStep(githubPrLabels: string): string | null {
  if (!shouldRunEvals(githubPrLabels)) {
    return null;
  }

  return [
    // NOTE: `getPipeline()` strips `steps:` from YAML fragments so they can be concatenated
    // under the single top-level `steps:` key. This must follow that convention.
    `  - label: ':robot_face: Trigger LLM Evals'`,
    `    key: kibana-evals-trigger`,
    `    depends_on:`,
    `      - build`,
    `    command: bash .buildkite/scripts/steps/evals/trigger_pr_evals.sh`,
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
