/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as parseYaml } from 'yaml';

// This label only starts the pipeline. It does not configure the run.
export const NIGHTSHIFT_EVAL_LABEL = 'ci:nightshift-evals';

const DEFAULT_TIMEOUT_IN_MINUTES = 90;
const TASK_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface NightshiftEvalDownload {
  // A gs:// path, copied to `dest` relative to the nightshift-evals checkout.
  readonly src: string;
  readonly dest: string;
  readonly recursive?: boolean;
}

/** One task of nightshift-evals' `ci/tasks.yaml`. */
export interface NightshiftEvalTaskConfig {
  // Extra `uv run eval <task>` flags. An empty list runs every example.
  readonly args: readonly string[];
  readonly downloads?: readonly NightshiftEvalDownload[];
  readonly timeoutMinutes?: number;
}

const isStringList = (value: readonly string[] | undefined): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const parseDownloads = (
  task: string,
  downloads: readonly Partial<NightshiftEvalDownload>[] | undefined
): NightshiftEvalDownload[] =>
  (downloads ?? []).map(({ src, dest, recursive }) => {
    if (typeof src !== 'string' || !src.startsWith('gs://')) {
      throw new Error(`ci/tasks.yaml: task "${task}" has a download without a gs:// \`src\``);
    }
    if (
      typeof dest !== 'string' ||
      dest === '' ||
      dest.startsWith('/') ||
      dest.split('/').includes('..')
    ) {
      throw new Error(`ci/tasks.yaml: task "${task}" has a download with a bad \`dest\`: ${dest}`);
    }
    return { src, dest, ...(recursive ? { recursive: true } : {}) };
  });

/**
 * Tasks of nightshift-evals' `ci/tasks.yaml`. Throws on a file CI cannot run safely. A task without
 * `args` is rejected, since an empty default would run every example of the task.
 */
export const parseNightshiftTasks = (raw: string): Record<string, NightshiftEvalTaskConfig> => {
  const parsed = parseYaml(raw) as {
    tasks?: Record<
      string,
      {
        args?: readonly string[];
        downloads?: readonly Partial<NightshiftEvalDownload>[];
        timeoutMinutes?: number;
      } | null
    >;
  } | null;

  const entries = Object.entries(parsed?.tasks ?? {});
  if (entries.length === 0) {
    throw new Error('ci/tasks.yaml has no tasks');
  }

  return Object.fromEntries(
    entries.map(([task, config]) => {
      if (!TASK_NAME_PATTERN.test(task)) {
        throw new Error(`ci/tasks.yaml: bad task name "${task}"`);
      }
      const args = config?.args;
      if (!isStringList(args) || args.some((arg) => /\s/.test(arg))) {
        throw new Error(
          `ci/tasks.yaml: task "${task}" needs an \`args\` list of strings without whitespace`
        );
      }
      const timeoutMinutes = config?.timeoutMinutes;
      if (
        timeoutMinutes !== undefined &&
        !(Number.isInteger(timeoutMinutes) && timeoutMinutes > 0)
      ) {
        throw new Error(`ci/tasks.yaml: task "${task}" has a bad \`timeoutMinutes\``);
      }
      return [task, { args, downloads: parseDownloads(task, config?.downloads), timeoutMinutes }];
    })
  );
};

const normalizeBuildkiteKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const runStepKey = (task: string): string => `nightshift-evals-${normalizeBuildkiteKey(task)}`;

const agentLines = (machineType: string, extra: string[] = []): string[] => [
  `    agents:`,
  `      image: family/kibana-ubuntu-2404`,
  `      imageProject: elastic-images-prod`,
  `      provider: gcp`,
  `      machineType: ${machineType}`,
  ...extra,
];

/**
 * YAML double-quoted scalar with `$` escaped to `$$` so Buildkite upload won't interpolate it.
 */
const toYamlString = (value: string): string => JSON.stringify(value).replace(/\$/g, '$$$$');

/**
 * Heavy steps run on preemptible (spot) agents unless `EVAL_PREEMPTIBLE` is `0`, `false` or `no`.
 * The PR pipeline sets `0`, so a lost worker does not silently re-run the experiment.
 */
export const isPreemptibleEnabled = (): boolean => {
  const raw = (process.env.EVAL_PREEMPTIBLE ?? '').trim().toLowerCase();
  return !['0', 'false', 'no'].includes(raw);
};

/** Whether the PR labels (a comma-separated string) contain the start label. */
const hasNightshiftEvalLabel = (githubPrLabels: string): boolean =>
  githubPrLabels
    .split(',')
    .map((label) => label.trim())
    .includes(NIGHTSHIFT_EVAL_LABEL);

/**
 * Command step that fires `kibana-nightshift-evals-pr`, or `null` without the start label.
 * Fire-and-forget: `soft_fail` keeps a trigger hiccup off the PR. It needs no Kibana build,
 * since nightshift-evals runs Kibana from source.
 */
export const getNightshiftEvalTriggerStep = (githubPrLabels: string): string | null => {
  if (!hasNightshiftEvalLabel(githubPrLabels)) {
    return null;
  }

  return [
    `  - label: ':robot_face: Trigger Nightshift Evals'`,
    `    key: nightshift-evals-trigger`,
    `    command: bash .buildkite/scripts/steps/nightshift_evals/trigger_pr.sh`,
    `    timeout_in_minutes: 10`,
    `    soft_fail: true`,
    ...agentLines('n2-standard-2'),
    `    retry:`,
    `      automatic:`,
    `        - exit_status: '*'`,
    `          limit: 1`,
  ].join('\n');
};

/** One run step per task and one PR comment step after all of them, as a YAML fragment. */
export const getNightshiftEvalSteps = ({
  tasks,
  preemptible,
}: {
  tasks: Record<string, NightshiftEvalTaskConfig>;
  preemptible: boolean;
}): string => {
  const taskNames = Object.keys(tasks);

  const runSteps = taskNames.map((task) => {
    const { args, downloads = [], timeoutMinutes = DEFAULT_TIMEOUT_IN_MINUTES } = tasks[task];
    return [
      `  - label: ${toYamlString(`Nightshift Evals: ${task}`)}`,
      `    key: ${runStepKey(task)}`,
      `    command: bash .buildkite/scripts/steps/nightshift_evals/run_task.sh`,
      `    env:`,
      `      KBN_EVALS: '1'`,
      `      FTR_EIS_CCM: '1'`,
      `      NIGHTSHIFT_EVAL_TASK: ${toYamlString(task)}`,
      // Kibana's default model.
      `      NIGHTSHIFT_EVAL_CONNECTOR_ID: ""`,
      `      NIGHTSHIFT_EVAL_ARGS: ${toYamlString(args.join(' '))}`,
      `      NIGHTSHIFT_EVAL_DOWNLOADS: ${toYamlString(JSON.stringify(downloads))}`,
      `    timeout_in_minutes: ${timeoutMinutes}`,
      ...agentLines('n2-standard-8', preemptible ? [`      preemptible: true`] : []),
      `    retry:`,
      `      automatic:`,
      // Preemptible only: retry lost workers (-1). Dropped otherwise so a lost
      // worker/timeout doesn't silently re-run the whole task.
      ...(preemptible ? [`        - exit_status: '-1'`, `          limit: 3`] : []),
      `        - exit_status: '*'`,
      `          limit: 1`,
    ].join('\n');
  });

  const commentStep = [
    `  - label: 'Nightshift Evals: post PR comment'`,
    `    key: nightshift-evals-pr-comment`,
    `    command: bash .buildkite/scripts/steps/nightshift_evals/post_pr_comment.sh`,
    `    env:`,
    `      KBN_EVALS: '1'`,
    `      NIGHTSHIFT_EVAL_TASKS: ${toYamlString(taskNames.join(','))}`,
    `    depends_on:`,
    ...taskNames.map((task) => `      - ${toYamlString(runStepKey(task))}`),
    `    allow_dependency_failure: true`,
    `    timeout_in_minutes: 10`,
    ...agentLines('n2-standard-2'),
  ].join('\n');

  return [...runSteps, commentStep].join('\n');
};
