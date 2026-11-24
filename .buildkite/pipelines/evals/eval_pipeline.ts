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

// Consumed by `run_suite.sh` (via jq) rather than here, but declared so this type describes the
// whole file. Each shard becomes its own fanout step running the spec files it lists, resolved
// relative to the suite root.
export interface EvalsSuiteShard {
  id: string;
  specFiles: string[];
  /** Evaluation connector for this shard's steps, overriding the suite-wide judge. */
  judge?: string;
  /** A key of the suite's `concurrencyGroups`, whose limit this shard's steps share instead. */
  concurrencyGroup?: string;
}

export interface EvalsSuiteSpecModelGroup {
  files: string[];
  models?: string[];
}

export interface EvalsSuiteMetadataEntry {
  id: string;
  name?: string;
  slackChannel?: string;
  ciLabels?: string[];
  configPath?: string;
  serverConfigSet?: string;
  scoutArch?: string;
  scoutDomain?: string;
  weeklyEisModelGroups?: string[];
  defaultModelGroups?: string[] | null;
  defaultJudge?: string;
  shards?: EvalsSuiteShard[];
  stepTimeoutInMinutes?: number;
  /**
   * How many of the suite's fanout steps run at once, across builds; 4 when unset. Shards in one of
   * `concurrencyGroups` count against that group's limit instead.
   */
  fanoutConcurrency?: number;
  /** Named concurrency limits, across builds, for shards that set `concurrencyGroup`. */
  concurrencyGroups?: Record<string, number>;
  specModelGroups?: EvalsSuiteSpecModelGroup[];
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
 * `evals:skip-<suite-id>` drops a suite even when its `evals:<suite-id>` label is present. Needed
 * because `.github/paths-labeller.yml` auto-applies `evals:smoke-tests` and re-adds it on every
 * push, so removing that label by hand doesn't stick.
 */
const EVALS_SKIP_LABEL_PREFIX = 'evals:skip-';

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

  // `models:judge:openrouter/<provider>-<model>` (e.g. `openrouter/openai-gpt-5.4`).
  if (raw.startsWith('openrouter/')) {
    return `openrouter-${normalizeBuildkiteKey(raw.slice('openrouter/'.length))}`;
  }

  // Native OpenRouter id (`openai/gpt-5.4`)
  if (raw.includes('/')) {
    return `openrouter-${normalizeBuildkiteKey(raw)}`;
  }

  // Already a connector id (e.g. `openrouter-*` / `eis-*`).
  return raw;
}

/**
 * Boot disk (GB) for eval agents. These steps spell out their own agent block, so they do not
 * inherit the repo-wide agent defaults. `undefined` uses the agent manager default; set a number
 * to override it. Keep `EVAL_AGENT_DISK_SIZE_GB` in `steps/evals/run_suite.sh` and
 * `llm_evals.yml` in sync.
 */
const EVAL_AGENT_DISK_SIZE_GB: number | undefined = undefined;

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

export interface EvalPipelinePlan {
  yaml: string;
  /**
   * Connector ids of the suites whose fanout is emitted here rather than by a parent
   * `run_suite.sh` step. That step publishes them as `kbn-evals:connectors:<suite>` meta-data for
   * the post-comparison and suite-owner-notify steps, so the pipeline generator has to instead.
   */
  connectorsBySuite: Record<string, string[]>;
}

const DEFAULT_FANOUT_CONCURRENCY = 4;
const DEFAULT_FANOUT_STEP_TIMEOUT_IN_MINUTES = 120;
const FANOUT_SPOT_ZONES =
  'asia-south2-a,asia-south2-b,asia-south2-c,northamerica-northeast2-a,northamerica-northeast2-b,northamerica-northeast2-c';

/**
 * EIS connector ids for model groups that each name one EIS model, or `null` when any group needs
 * EIS or OpenRouter discovery to resolve. Connector ids are derived from the model id the same way
 * `generate_eis_connectors.js` derives them, so they match what the fanout steps provision.
 */
function resolveEisConnectorIds(modelGroups: string[]): string[] | null {
  if (modelGroups.length === 0 || !modelGroups.every((group) => /^eis\/\S+$/.test(group))) {
    return null;
  }
  return [...new Set(modelGroups.map(normalizeEvaluationConnectorId))];
}

const yamlEnv = (indent: string, env: Record<string, string | undefined>): string[] =>
  Object.entries(env)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => `${indent}${name}: ${toBuildkiteYamlString(value)}`);

const lightAgentYaml = (indent: string): string[] => [
  `${indent}agents:`,
  `${indent}  image: family/kibana-ubuntu-2404`,
  `${indent}  imageProject: elastic-images-prod`,
  `${indent}  provider: gcp`,
  `${indent}  machineType: n2-standard-2`,
  `${indent}  preemptible: true`,
  `${indent}  spotZones: ${FANOUT_SPOT_ZONES}`,
];

/**
 * The fanout `run_suite.sh` uploads from its parent step (one step per connector and shard, then
 * the suite-owner notify, post-comparison and refresh steps), emitted at pipeline generation so no
 * parent step has to wait for an agent, bootstrap and discover EIS models first. Keep it in sync
 * with the fanout in `.buildkite/scripts/steps/evals/run_suite.sh`.
 */
function buildDirectFanoutYaml({
  suite,
  modelGroups,
  connectorIds,
  evaluationConnectorId,
  preemptible,
}: {
  suite: EvalsSuiteMetadataEntry;
  modelGroups: string[];
  connectorIds: string[];
  evaluationConnectorId: string | undefined;
  preemptible: boolean;
}): string {
  const suiteKey = normalizeBuildkiteKey(suite.id);
  const timeoutInMinutes =
    Number(process.env.EVAL_STEP_TIMEOUT_IN_MINUTES) ||
    suite.stepTimeoutInMinutes ||
    DEFAULT_FANOUT_STEP_TIMEOUT_IN_MINUTES;
  const concurrency =
    Number(process.env.EVAL_FANOUT_CONCURRENCY) ||
    suite.fanoutConcurrency ||
    DEFAULT_FANOUT_CONCURRENCY;
  const pullRequest =
    process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false'
      ? process.env.BUILDKITE_PULL_REQUEST
      : undefined;
  const prNumber = process.env.GITHUB_PR_NUMBER || pullRequest;
  const shards: EvalsSuiteShard[] = suite.shards?.length
    ? suite.shards
    : [{ id: '', specFiles: [] }];

  const stepKeys: string[] = [];
  const evalSteps = shards.flatMap((shard) =>
    connectorIds.map((connectorId) => {
      const shardKey = normalizeBuildkiteKey(shard.id);
      const stepKey = [`kbn-evals-${suiteKey}-${normalizeBuildkiteKey(connectorId)}`, shardKey]
        .filter(Boolean)
        .join('-');
      stepKeys.push(stepKey);
      return [
        `      - label: ${toBuildkiteYamlString(
          `LLM Evals: ${suite.id} / ${connectorId}${shard.id ? ` [${shard.id}]` : ''}`
        )}`,
        `        key: ${toBuildkiteYamlString(stepKey)}`,
        `        command: "bash .buildkite/scripts/steps/evals/run_suite.sh"`,
        `        env:`,
        ...yamlEnv('          ', {
          KBN_EVALS: '1',
          FTR_EIS_CCM: '1',
          EVAL_INCLUDE_EIS_MODELS: '1',
          EVAL_MODEL_GROUPS: modelGroups.join(','),
          // A shard's own judge wins over the suite-wide one, as in run_suite.sh.
          EVAL_CONNECTOR_ID: shard.judge?.trim() || evaluationConnectorId,
          EVAL_SUITE_ID: suite.id,
          EVAL_SUITE_NAME: suite.name,
          EVAL_SUITE_SLACK_CHANNEL: suite.slackChannel,
          EVAL_PROJECT: connectorId,
          EVAL_SHARD_ID: shard.id,
          EVAL_FANOUT: '0',
          EVAL_SERVER_CONFIG_SET: suite.serverConfigSet,
          EVAL_SCOUT_ARCH: suite.scoutArch,
          EVAL_SCOUT_DOMAIN: suite.scoutDomain,
          EVAL_SPEC_FILES: shard.specFiles.join(' '),
        }),
        `        timeout_in_minutes: ${timeoutInMinutes}`,
        `        concurrency_group: ${toBuildkiteYamlString(`kbn-evals-${suiteKey}`)}`,
        `        concurrency: ${concurrency}`,
        `        agents:`,
        `          image: family/kibana-ubuntu-2404`,
        `          imageProject: elastic-images-prod`,
        `          provider: gcp`,
        `          machineType: n2-standard-8`,
        ...(EVAL_AGENT_DISK_SIZE_GB ? [`          diskSizeGb: ${EVAL_AGENT_DISK_SIZE_GB}`] : []),
        ...(preemptible
          ? [
              `          preemptible: true`,
              `          spotZones: ${FANOUT_SPOT_ZONES}`,
              `        retry:`,
              `          automatic:`,
              `            - exit_status: "-1"`,
              `              limit: 3`,
            ]
          : []),
      ].join('\n');
    })
  );

  const dependsOnEvalSteps = [
    `        depends_on:`,
    ...stepKeys.map((stepKey) => `          - ${toBuildkiteYamlString(stepKey)}`),
  ];
  const notifyStep = prNumber
    ? [
        `      - label: ${toBuildkiteYamlString(`LLM Evals: ${suite.id} (suite owner notify)`)}`,
        `        key: ${toBuildkiteYamlString(`kbn-evals-${suiteKey}-suite-owner-notify`)}`,
        `        command: "bash .buildkite/scripts/steps/evals/suite_owner_notify.sh"`,
        `        env:`,
        ...yamlEnv('          ', {
          KBN_EVALS: '1',
          EVAL_SUITE_ID: suite.id,
          EVAL_SUITE_SLACK_CHANNEL: suite.slackChannel,
          EVAL_PR_NUMBER: prNumber,
          EVAL_SUITE_NAME: suite.name,
          EVAL_FANOUT_STEP_KEYS: stepKeys.join(','),
        }),
        ...dependsOnEvalSteps,
        `        timeout_in_minutes: 10`,
        `        allow_dependency_failure: true`,
        `        soft_fail: true`,
        ...lightAgentYaml('        '),
      ]
    : [];
  const postComparisonKey = `kbn-evals-${suiteKey}-post-comparison`;
  const postComparisonStep = pullRequest
    ? [
        `      - label: ${toBuildkiteYamlString(`LLM Evals: ${suite.id} (post comparison)`)}`,
        `        key: ${toBuildkiteYamlString(postComparisonKey)}`,
        `        command: "bash .buildkite/scripts/steps/evals/post_eval_comment.sh"`,
        `        env:`,
        ...yamlEnv('          ', {
          KBN_EVALS: '1',
          EVAL_SUITE_ID: suite.id,
          EVAL_SUITE_IDS: suite.id,
        }),
        ...dependsOnEvalSteps,
        `        timeout_in_minutes: 10`,
        `        allow_dependency_failure: true`,
        ...lightAgentYaml('        '),
      ]
    : [];
  const suiteDisplayName = suite.name || suite.id;
  const refreshSteps = pullRequest
    ? [
        `  - block: ${toBuildkiteYamlString(`LLM Evals: Refresh ${suiteDisplayName}`)}`,
        `    key: ${toBuildkiteYamlString(`kbn-evals-${suiteKey}-refresh-block`)}`,
        `    depends_on:`,
        `      - ${toBuildkiteYamlString(postComparisonKey)}`,
        `    allow_dependency_failure: true`,
        `  - trigger: kibana-evals-on-demand-llm-evals`,
        `    label: ${toBuildkiteYamlString(`LLM Evals: Refresh ${suiteDisplayName}`)}`,
        `    key: ${toBuildkiteYamlString(`kbn-evals-${suiteKey}-refresh-trigger`)}`,
        `    async: true`,
        `    soft_fail: true`,
        `    depends_on:`,
        `      - ${toBuildkiteYamlString(`kbn-evals-${suiteKey}-refresh-block`)}`,
        `    build:`,
        `      branch: main`,
        `      message: ${toBuildkiteYamlString(
          `Fresh baseline for PR #${pullRequest}: ${suite.id}`
        )}`,
        `      env:`,
        ...yamlEnv('        ', {
          EVAL_SUITE_ID: suite.id,
          EVAL_SUITE_IDS: suite.id,
          FRESH_BASELINE_PR_EXPERIMENT_ID: `bk-${process.env.BUILDKITE_BUILD_ID ?? ''}`,
          EVAL_PR_NUMBER: pullRequest,
          EVAL_CONNECTOR_ID: evaluationConnectorId,
          EVAL_INCLUDE_EIS_MODELS: '1',
          EVAL_MODEL_GROUPS: modelGroups.join(','),
          EVAL_SERVER_CONFIG_SET: suite.serverConfigSet,
          EVAL_SCOUT_ARCH: suite.scoutArch,
          EVAL_SCOUT_DOMAIN: suite.scoutDomain,
        }),
      ]
    : [];

  return [
    `  - group: ${toBuildkiteYamlString(`LLM Evals: ${suite.id}`)}`,
    `    key: ${toBuildkiteYamlString(`kbn-evals-${suiteKey}-fanout`)}`,
    `    depends_on:`,
    `      - build`,
    `    steps:`,
    ...evalSteps,
    ...notifyStep,
    ...postComparisonStep,
    ...refreshSteps,
  ].join('\n');
}

function buildEvalsYaml({
  selectedSuites,
  resolveModelGroups,
  resolveJudge,
}: {
  selectedSuites: EvalsSuiteMetadataEntry[];
  resolveModelGroups: (suite: EvalsSuiteMetadataEntry) => string[];
  resolveJudge: (suite: EvalsSuiteMetadataEntry) => EvalJudge;
}): EvalPipelinePlan {
  const preemptible = isPreemptibleEnabled();
  const connectorsBySuite: Record<string, string[]> = {};
  const directFanouts: string[] = [];
  const parentSuites: EvalsSuiteMetadataEntry[] = [];
  for (const suite of selectedSuites) {
    const modelGroups = resolveModelGroups(suite);
    const connectorIds = resolveEisConnectorIds(modelGroups);
    if (!connectorIds) {
      parentSuites.push(suite);
      continue;
    }
    connectorsBySuite[suite.id] = connectorIds;
    directFanouts.push(
      buildDirectFanoutYaml({
        suite,
        modelGroups,
        connectorIds,
        evaluationConnectorId: resolveJudge(suite).evaluationConnectorId,
        preemptible,
      })
    );
  }

  const suiteSteps = parentSuites
    .map((suite) => {
      const key = `kbn-evals-${normalizeBuildkiteKey(suite.id)}`;
      const label = suite.name ? `Evals: ${suite.name}` : `Evals: ${suite.id}`;
      const suiteModelGroups = resolveModelGroups(suite);
      const { evaluationConnectorId, hasEisJudge } = resolveJudge(suite);
      // Label-derived values cross a pipeline boundary; serialize as `$`-safe YAML.
      const modelGroupsEnv =
        suiteModelGroups.length > 0
          ? `          EVAL_MODEL_GROUPS: ${toBuildkiteYamlString(suiteModelGroups.join(','))}`
          : null;
      const evaluationConnectorIdEnv = evaluationConnectorId
        ? `          EVAL_CONNECTOR_ID: ${toBuildkiteYamlString(evaluationConnectorId)}`
        : null;
      const includeEisModels =
        hasEisJudge || suiteModelGroups.some((group) => group.startsWith('eis/'));
      const includeEisModelsEnv = includeEisModels
        ? `          EVAL_INCLUDE_EIS_MODELS: '1'`
        : null;
      const evalServerConfigSetEnv = suite.serverConfigSet
        ? `          EVAL_SERVER_CONFIG_SET: ${toBuildkiteYamlString(suite.serverConfigSet)}`
        : null;
      const evalScoutTargetEnv = [
        ...(suite.scoutArch
          ? [`          EVAL_SCOUT_ARCH: ${toBuildkiteYamlString(suite.scoutArch)}`]
          : []),
        ...(suite.scoutDomain
          ? [`          EVAL_SCOUT_DOMAIN: ${toBuildkiteYamlString(suite.scoutDomain)}`]
          : []),
      ];
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
        ...evalScoutTargetEnv,
        `        timeout_in_minutes: 60`,
        `        agents:`,
        `          image: family/kibana-ubuntu-2404`,
        `          imageProject: elastic-images-prod`,
        `          provider: gcp`,
        `          machineType: n2-standard-8`,
        ...(EVAL_AGENT_DISK_SIZE_GB ? [`          diskSizeGb: ${EVAL_AGENT_DISK_SIZE_GB}`] : []),
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

  const yaml = [
    // `getPipeline()` strips `steps:` so fragments concatenate under one top-level `steps:`.
    ...(parentSuites.length > 0
      ? [
          `  - group: LLM Evals`,
          `    key: kibana-evals`,
          `    depends_on:`,
          `      - build`,
          `    steps:`,
          suiteSteps,
        ]
      : []),
    ...directFanouts,
  ].join('\n');
  return { yaml, connectorsBySuite };
}

interface EvalJudge {
  evaluationConnectorId: string | undefined;
  hasEisJudge: boolean;
}

interface EvalSelection {
  runnableSuites: EvalsSuiteMetadataEntry[];
  resolveModelGroups: (suite: EvalsSuiteMetadataEntry) => string[];
  resolveJudge: (suite: EvalsSuiteMetadataEntry) => EvalJudge;
}

/**
 * Which suites/models run for the PR labels, or `null`. Shared by `getEvalPipeline` and
 * `getEvalTriggerStep` so the label gate lives in one place.
 */
function resolveEvalSelection(githubPrLabels: string): EvalSelection | null {
  const parsedLabels = parseGithubPrLabels(githubPrLabels);

  const skippedSuiteIds = new Set(
    parsedLabels
      .filter((label) => label.startsWith(EVALS_SKIP_LABEL_PREFIX))
      .map((label) => label.slice(EVALS_SKIP_LABEL_PREFIX.length).trim())
      .filter(Boolean)
  );

  // Most PRs carry no eval labels; bail before reading suite metadata so we don't spawn a
  // `git ls-tree` per suite on every kibana-pull-request pipeline generation.
  const hasSelectionLabel = parsedLabels.some(
    (label) =>
      (label.startsWith('evals:') && !label.startsWith(EVALS_SKIP_LABEL_PREFIX)) ||
      label.startsWith('models:')
  );
  if (!hasSelectionLabel) {
    return null;
  }

  // Run eval suite(s) when their GH label(s) are present (see `evals.suites.json`).
  const evalSuites = readEvalsSuiteMetadata();
  const runAllEvals = parsedLabels.includes('evals:all');
  const selectedEvalSuites = (
    runAllEvals
      ? evalSuites
      : evalSuites.filter((suite) => {
          const labels = suite.ciLabels?.length ? suite.ciLabels : [`evals:${suite.id}`];
          return labels.some((label) => parsedLabels.includes(label));
        })
  ).filter((suite) => !skippedSuiteIds.has(suite.id));
  // Model filtering (models:* labels): none => skip (explicit selection required);
  // `models:<group>` => run those groups; aliases (e.g. `models:weekly-eis-models`) expand.
  const rawEvaluationConnectorId = parsedLabels
    .find((label) => label.startsWith('models:judge:'))
    ?.slice('models:judge:'.length)
    ?.trim();
  const labelEvaluationConnectorId = rawEvaluationConnectorId
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

  const resolveJudge = (suite: EvalsSuiteMetadataEntry): EvalJudge => {
    const evaluationConnectorId =
      labelEvaluationConnectorId ??
      (suite.defaultJudge ? normalizeEvaluationConnectorId(suite.defaultJudge) : undefined);
    return {
      evaluationConnectorId,
      hasEisJudge:
        !!rawEvaluationConnectorId?.startsWith('eis/') ||
        !!evaluationConnectorId?.startsWith('eis-'),
    };
  };

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
    resolveJudge,
  };
}

/** Whether any eval suite should run for the given PR labels. */
export function shouldRunEvals(githubPrLabels: string): boolean {
  return resolveEvalSelection(githubPrLabels) !== null;
}

/** Buildkite YAML for the eval suites matching the PR labels and the connectors it fans out to, or `null`. */
export function getEvalPipelinePlan(githubPrLabels: string): EvalPipelinePlan | null {
  const selection = resolveEvalSelection(githubPrLabels);
  if (!selection) {
    return null;
  }

  return buildEvalsYaml({
    selectedSuites: selection.runnableSuites,
    resolveModelGroups: selection.resolveModelGroups,
    resolveJudge: selection.resolveJudge,
  });
}

/** Buildkite YAML for the eval suites matching the PR labels, or `null`. */
export function getEvalPipeline(githubPrLabels: string): string | null {
  return getEvalPipelinePlan(githubPrLabels)?.yaml ?? null;
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
