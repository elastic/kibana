/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getForwardablePrLabels,
  parseGithubPrLabels,
  toBuildkiteYamlString,
} from '../evals/eval_pipeline.ts';

const TASK_LABEL_PREFIX = 'nightshift-evals:';
const ALL_TASKS = 'all';
const MODEL_LABEL_PREFIX = 'models:';
const EIS_MODEL_PREFIX = 'eis/';
const DEFAULT_TIMEOUT_IN_MINUTES = 90;

export interface NightshiftEvalDownload {
  // A gs:// path, copied to `dest` relative to the nightshift-evals checkout.
  src: string;
  dest: string;
  recursive?: boolean;
}

export interface NightshiftEvalTaskConfig {
  timeoutMinutes?: number;
  downloads?: NightshiftEvalDownload[];
  pr?: { args?: string[] };
}

export interface NightshiftEvalSelection {
  // Task ids, or `'all'` for every task in `ci/tasks.yaml`.
  tasks: string[] | typeof ALL_TASKS;
  // Connector ids; an empty entry (`''`) means Kibana's default model.
  connectorIds: string[];
}

/**
 * Same id Kibana's `--eis` flag gives a preconfigured connector, see `toConnectorId` in
 * `packages/kbn-cli-dev-mode/src/eis_dev_orchestrator.ts`.
 */
export const toConnectorId = (modelId: string): string =>
  modelId
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const normalizeBuildkiteKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const toConnectorIds = (modelGroups: string[]): string[] => {
  const ids = modelGroups
    .filter((group) => group.startsWith(EIS_MODEL_PREFIX))
    .map((group) => toConnectorId(group.slice(EIS_MODEL_PREFIX.length)))
    .filter(Boolean);
  return ids.length > 0 ? [...new Set(ids)] : [''];
};

/** Which tasks and models the PR labels select, or `null` when no task label is present. */
export const parseNightshiftSelection = (githubPrLabels: string): NightshiftEvalSelection | null => {
  const labels = parseGithubPrLabels(githubPrLabels);
  const tasks = labels
    .filter((label) => label.startsWith(TASK_LABEL_PREFIX))
    .map((label) => label.slice(TASK_LABEL_PREFIX.length).trim())
    .filter(Boolean);
  if (tasks.length === 0) {
    return null;
  }

  const modelGroups = labels
    .filter((label) => label.startsWith(MODEL_LABEL_PREFIX))
    .map((label) => label.slice(MODEL_LABEL_PREFIX.length).trim())
    .filter((group) => !group.startsWith('judge:'));
  const ignored = modelGroups.filter((group) => !group.startsWith(EIS_MODEL_PREFIX));
  if (ignored.length > 0) {
    console.error(`nightshift-evals only supports eis/* models; ignoring: ${ignored.join(', ')}`);
  }

  return {
    tasks: tasks.includes(ALL_TASKS) ? ALL_TASKS : [...new Set(tasks)],
    connectorIds: toConnectorIds(modelGroups),
  };
};

/** Same selection from the env of an on-demand build. */
export const parseNightshiftSelectionFromEnv = (
  taskEnv: string,
  modelGroupsEnv: string
): NightshiftEvalSelection | null => {
  const tasks = taskEnv
    .split(',')
    .map((task) => task.trim())
    .filter(Boolean);
  if (tasks.length === 0) {
    return null;
  }
  const modelGroups = modelGroupsEnv
    .split(',')
    .map((group) => group.trim())
    .filter(Boolean);
  return {
    tasks: tasks.includes(ALL_TASKS) ? ALL_TASKS : [...new Set(tasks)],
    connectorIds: toConnectorIds(modelGroups),
  };
};

/**
 * Task steps for a selection, as a YAML fragment under one group. Preemptible only when
 * `preemptible` is true, so a PR run is never silently re-run after a lost worker.
 */
export const buildNightshiftEvalSteps = ({
  tasks,
  connectorIds,
  taskConfigs,
  extraArgs = [],
  preemptible,
}: {
  tasks: string[];
  connectorIds: string[];
  taskConfigs: Record<string, NightshiftEvalTaskConfig>;
  extraArgs?: string[];
  preemptible: boolean;
}): string => {
  const unknown = tasks.filter((task) => !taskConfigs[task]);
  if (unknown.length > 0) {
    throw new Error(
      `Unknown nightshift-evals task(s): ${unknown.join(', ')}. ` +
        `Known: ${Object.keys(taskConfigs).join(', ') || 'none'}`
    );
  }

  const steps = tasks.flatMap((task) =>
    connectorIds.map((connectorId) => {
      const config = taskConfigs[task];
      const args = [...(config.pr?.args ?? []), ...extraArgs];
      const key = `nightshift-evals-${normalizeBuildkiteKey(task)}-${
        normalizeBuildkiteKey(connectorId) || 'default'
      }`;
      return [
        `      - label: ${toBuildkiteYamlString(`Nightshift Evals: ${task} / ${connectorId || 'default'}`)}`,
        `        key: ${key}`,
        `        command: bash .buildkite/scripts/steps/nightshift_evals/run_task.sh`,
        `        env:`,
        `          KBN_EVALS: '1'`,
        `          FTR_EIS_CCM: '1'`,
        `          NIGHTSHIFT_EVAL_TASK: ${toBuildkiteYamlString(task)}`,
        `          NIGHTSHIFT_EVAL_CONNECTOR_ID: ${toBuildkiteYamlString(connectorId)}`,
        `          NIGHTSHIFT_EVAL_ARGS: ${toBuildkiteYamlString(args.join(' '))}`,
        `          NIGHTSHIFT_EVAL_DOWNLOADS: ${toBuildkiteYamlString(
          JSON.stringify(config.downloads ?? [])
        )}`,
        `        timeout_in_minutes: ${config.timeoutMinutes ?? DEFAULT_TIMEOUT_IN_MINUTES}`,
        `        agents:`,
        `          image: family/kibana-ubuntu-2404`,
        `          imageProject: elastic-images-prod`,
        `          provider: gcp`,
        `          machineType: n2-standard-8`,
        ...(preemptible ? [`          preemptible: true`] : []),
        `        retry:`,
        `          automatic:`,
        ...(preemptible ? [`            - exit_status: '-1'`, `              limit: 3`] : []),
        `            - exit_status: '*'`,
        `              limit: 1`,
      ].join('\n');
    })
  );

  const taskKeys = tasks.flatMap((task) =>
    connectorIds.map(
      (connectorId) =>
        `nightshift-evals-${normalizeBuildkiteKey(task)}-${
          normalizeBuildkiteKey(connectorId) || 'default'
        }`
    )
  );

  const commentStep = [
    `      - label: 'Nightshift Evals: post PR comment'`,
    `        key: nightshift-evals-pr-comment`,
    `        command: bash .buildkite/scripts/steps/nightshift_evals/post_pr_comment.sh`,
    `        env:`,
    `          KBN_EVALS: '1'`,
    `          NIGHTSHIFT_EVAL_TASKS: ${toBuildkiteYamlString(tasks.join(','))}`,
    `        depends_on:`,
    ...taskKeys.map((taskKey) => `          - ${toBuildkiteYamlString(taskKey)}`),
    `        allow_dependency_failure: true`,
    `        timeout_in_minutes: 10`,
    `        agents:`,
    `          image: family/kibana-ubuntu-2404`,
    `          imageProject: elastic-images-prod`,
    `          provider: gcp`,
    `          machineType: n2-standard-2`,
  ].join('\n');

  return [
    `steps:`,
    `  - group: Nightshift Evals`,
    `    key: nightshift-evals`,
    `    steps:`,
    ...steps,
    commentStep,
  ].join('\n');
};

/**
 * Command step that fires `kibana-nightshift-evals-pr`, or `null` when no task label is set.
 * Fire-and-forget like the kbn-evals trigger: `soft_fail` keeps a trigger hiccup off the PR.
 * Needs no Kibana build, since nightshift-evals runs Kibana from source.
 */
export const getNightshiftEvalTriggerStep = (githubPrLabels: string): string | null => {
  const forwardableLabels = getForwardablePrLabels(githubPrLabels);
  if (!parseNightshiftSelection(forwardableLabels)) {
    return null;
  }

  return [
    `  - label: ':robot_face: Trigger Nightshift Evals'`,
    `    key: nightshift-evals-trigger`,
    `    command: bash .buildkite/scripts/steps/nightshift_evals/trigger_pr.sh`,
    `    env:`,
    `      GITHUB_PR_LABELS: ${toBuildkiteYamlString(forwardableLabels)}`,
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
};
