/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This label only starts the pipeline. It does not configure the run.
export const NIGHTSHIFT_EVAL_LABEL = 'ci:nightshift-evals';

export interface NightshiftEvalDownload {
  // A gs:// path, copied to `dest` relative to the nightshift-evals checkout.
  readonly src: string;
  readonly dest: string;
  readonly recursive?: boolean;
}

export interface NightshiftEvalExperiment {
  readonly task: string;
  // Extra `uv run eval <task>` flags.
  readonly args: readonly string[];
  readonly downloads: readonly NightshiftEvalDownload[];
  readonly timeoutMinutes: number;
  // An empty id means Kibana's default model.
  readonly connectorId: string;
}

/** The experiment CI runs. Change it here. */
export const NIGHTSHIFT_EXPERIMENT: NightshiftEvalExperiment = {
  task: 'ki_feature_extraction',
  args: ['--dataset', 'orca-bench', '--scenario', 'day-2026-04-19'],
  downloads: [
    {
      src: 'gs://nightshift-datasets/orca-bench/data-0418/2026-10-01/snapshots',
      dest: 'snapshots/orca-bench/repository',
      recursive: true,
    },
    {
      src: 'gs://nightshift-datasets/orca-bench/data-0418/2026-10-01/manifest.json',
      dest: 'snapshots/orca-bench/manifest.json',
    },
    {
      src: 'gs://nightshift-datasets/detection-engine/ki-feature-extraction/orca-bench/v1/ground-truth.json',
      dest: 'tasks/ki_feature_extraction/ground-truth/orca-bench-v1.json',
    },
  ],
  timeoutMinutes: 240,
  connectorId: '',
};

const RUN_STEP_KEY = 'nightshift-evals-run';

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

/** The run step and the PR comment step for `NIGHTSHIFT_EXPERIMENT`, as a YAML fragment. */
export const getNightshiftEvalSteps = ({ preemptible }: { preemptible: boolean }): string => {
  const { task, args, downloads, timeoutMinutes, connectorId } = NIGHTSHIFT_EXPERIMENT;

  const runStep = [
    `  - label: ${toYamlString(`Nightshift Evals: ${task}`)}`,
    `    key: ${RUN_STEP_KEY}`,
    `    command: bash .buildkite/scripts/steps/nightshift_evals/run_task.sh`,
    `    env:`,
    `      KBN_EVALS: '1'`,
    `      FTR_EIS_CCM: '1'`,
    `      NIGHTSHIFT_EVAL_TASK: ${toYamlString(task)}`,
    `      NIGHTSHIFT_EVAL_CONNECTOR_ID: ${toYamlString(connectorId)}`,
    `      NIGHTSHIFT_EVAL_ARGS: ${toYamlString(args.join(' '))}`,
    `      NIGHTSHIFT_EVAL_DOWNLOADS: ${toYamlString(JSON.stringify(downloads))}`,
    `    timeout_in_minutes: ${timeoutMinutes}`,
    ...agentLines('n2-standard-8', preemptible ? [`      preemptible: true`] : []),
    `    retry:`,
    `      automatic:`,
    // Preemptible only: retry lost workers (-1). Dropped otherwise so a lost
    // worker/timeout doesn't silently re-run the whole experiment.
    ...(preemptible ? [`        - exit_status: '-1'`, `          limit: 3`] : []),
    `        - exit_status: '*'`,
    `          limit: 1`,
  ].join('\n');

  const commentStep = [
    `  - label: 'Nightshift Evals: post PR comment'`,
    `    key: nightshift-evals-pr-comment`,
    `    command: bash .buildkite/scripts/steps/nightshift_evals/post_pr_comment.sh`,
    `    env:`,
    `      KBN_EVALS: '1'`,
    `      NIGHTSHIFT_EVAL_TASKS: ${toYamlString(task)}`,
    `    depends_on: ${RUN_STEP_KEY}`,
    `    allow_dependency_failure: true`,
    `    timeout_in_minutes: 10`,
    ...agentLines('n2-standard-2'),
  ].join('\n');

  return [runStep, commentStep].join('\n');
};
