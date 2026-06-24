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

function buildEvalsYaml({
  selectedSuites,
  resolveModelGroups,
  evaluationConnectorId,
  hasEisJudge,
  isPrBuild,
}: {
  selectedSuites: EvalsSuiteMetadataEntry[];
  resolveModelGroups: (suite: EvalsSuiteMetadataEntry) => string[];
  evaluationConnectorId: string | undefined;
  hasEisJudge: boolean;
  isPrBuild: boolean;
}): string {
  const suiteSteps = selectedSuites
    .map((suite) => {
      const key = `kbn-evals-${normalizeBuildkiteKey(suite.id)}`;
      const label = suite.name ? `Evals: ${suite.name}` : `Evals: ${suite.id}`;
      const suiteModelGroups = resolveModelGroups(suite);
      const modelGroupsEnv =
        suiteModelGroups.length > 0
          ? `          EVAL_MODEL_GROUPS: '${suiteModelGroups.join(',')}'`
          : null;
      const evaluationConnectorIdEnv = evaluationConnectorId
        ? `          EVALUATION_CONNECTOR_ID: '${evaluationConnectorId}'`
        : null;
      const includeEisModels =
        hasEisJudge || suiteModelGroups.some((group) => group.startsWith('eis/'));
      const includeEisModelsEnv = includeEisModels
        ? `          EVAL_INCLUDE_EIS_MODELS: '1'`
        : null;
      const evalServerConfigSetEnv = suite.serverConfigSet
        ? `          EVAL_SERVER_CONFIG_SET: '${suite.serverConfigSet}'`
        : null;
      return [
        `      - label: '${label}'`,
        `        key: ${key}`,
        `        command: bash .buildkite/scripts/steps/evals/run_suite.sh`,
        `        env:`,
        `          KBN_EVALS: '1'`,
        `          FTR_EIS_CCM: '1'`,
        `          EVAL_SUITE_ID: '${suite.id}'`,
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
        `          preemptible: true`,
        `        retry:`,
        `          automatic:`,
        `            - exit_status: '-1'`,
        `              limit: 3`,
        `            - exit_status: '*'`,
        `              limit: 1`,
      ].join('\n');
    })
    .join('\n');

  const suiteIds = selectedSuites.map((s) => s.id).join(',');
  const suiteStepKeys = selectedSuites.map((s) => `kbn-evals-${normalizeBuildkiteKey(s.id)}`);

  const postCompareStep = isPrBuild
    ? [
        `      - label: 'LLM Evals: Post Comparison'`,
        `        key: kbn-evals-post-comparison`,
        `        command: bash .buildkite/scripts/steps/evals/post_eval_comment.sh`,
        `        env:`,
        `          KBN_EVALS: '1'`,
        `          EVAL_SUITE_IDS: '${suiteIds}'`,
        `        depends_on:`,
        ...suiteStepKeys.map((k) => `          - ${k}`),
        `        allow_dependency_failure: true`,
        `        timeout_in_minutes: 10`,
        `        agents:`,
        `          image: family/kibana-ubuntu-2404`,
        `          imageProject: elastic-images-prod`,
        `          provider: gcp`,
        `          machineType: n2-standard-2`,
        `          preemptible: true`,
      ].join('\n')
    : null;

  const prBuildId = process.env.BUILDKITE_BUILD_ID ?? '';
  const prNumber = process.env.BUILDKITE_PULL_REQUEST ?? '';

  const refreshBlockStep = isPrBuild
    ? [
        `      - block: 'LLM Evals: Refresh Baseline'`,
        `        key: kbn-evals-refresh-block`,
        `        blocked_state: passed`,
        `        depends_on:`,
        `          - kbn-evals-post-comparison`,
        `        allow_dependency_failure: true`,
      ].join('\n')
    : null;

  const refreshTriggerSteps = isPrBuild
    ? selectedSuites.map((suite) => {
        const triggerKey = `kbn-evals-refresh-${normalizeBuildkiteKey(suite.id)}`;
        const suiteModelGroups = resolveModelGroups(suite);
        const includeEisModels =
          hasEisJudge || suiteModelGroups.some((group) => group.startsWith('eis/'));
        const triggerEnvLines: string[] = [
          `            EVAL_SUITE_ID: '${suite.id}'`,
          `            EVAL_SUITE_IDS: '${suite.id}'`,
          `            FRESH_BASELINE_PR_EXPERIMENT_ID: 'bk-${prBuildId}'`,
          `            GITHUB_PR_NUMBER: '${prNumber}'`,
        ];
        if (evaluationConnectorId) {
          triggerEnvLines.push(`            EVALUATION_CONNECTOR_ID: '${evaluationConnectorId}'`);
        }
        if (includeEisModels) {
          triggerEnvLines.push(`            EVAL_INCLUDE_EIS_MODELS: '1'`);
        }
        if (suiteModelGroups.length > 0) {
          triggerEnvLines.push(`            EVAL_MODEL_GROUPS: '${suiteModelGroups.join(',')}'`);
        }
        if (suite.serverConfigSet) {
          triggerEnvLines.push(`            EVAL_SERVER_CONFIG_SET: '${suite.serverConfigSet}'`);
        }
        return [
          `      - trigger: kibana-evals-on-demand`,
          `        label: 'LLM Evals: Refresh ${suite.name || suite.id}'`,
          `        key: ${triggerKey}`,
          `        depends_on:`,
          `          - kbn-evals-refresh-block`,
          `        build:`,
          `          branch: main`,
          `          message: 'Fresh baseline for PR #${prNumber}: ${suite.id}'`,
          `          env:`,
          ...triggerEnvLines,
        ].join('\n');
      })
    : [];

  return [
    // NOTE: `getPipeline()` strips `steps:` from YAML fragments so they can be concatenated
    // under the single top-level `steps:` key. This must follow that convention.
    `  - group: LLM Evals`,
    `    key: kibana-evals`,
    `    depends_on:`,
    `      - build`,
    `    steps:`,
    suiteSteps,
    ...(postCompareStep ? [postCompareStep] : []),
    ...(refreshBlockStep ? [refreshBlockStep] : []),
    ...refreshTriggerSteps,
  ].join('\n');
}

/**
 * Reads evals suite metadata and PR labels, then returns a Buildkite YAML group
 * for the matching eval suites.
 */
export function getEvalPipeline(githubPrLabels: string): string | null {
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

  const isPrBuild =
    !!process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false';

  return buildEvalsYaml({
    selectedSuites: runnableSuites,
    resolveModelGroups,
    evaluationConnectorId,
    hasEisJudge,
    isPrBuild,
  });
}
