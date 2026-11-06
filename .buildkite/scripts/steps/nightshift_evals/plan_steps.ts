/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint "no-restricted-syntax": [
            "error",
            {
                "selector": "CallExpression[callee.object.name='console'][callee.property.name!=/^(warn|error)$/]",
                "message": "stdout of this file is uploaded as pipeline YAML. Log to stderr."
            }
        ] */

import Fs from 'fs';
import Path from 'path';
import { parse as parseYaml } from 'yaml';
import type { NightshiftEvalTaskConfig } from '../../../pipelines/nightshift_evals/nightshift_evals_pipeline.ts';
import {
  buildNightshiftEvalSteps,
  parseNightshiftSelection,
  parseNightshiftSelectionFromEnv,
} from '../../../pipelines/nightshift_evals/nightshift_evals_pipeline.ts';

const evalsDir = process.env.NIGHTSHIFT_EVALS_DIR;
if (!evalsDir) {
  console.error('NIGHTSHIFT_EVALS_DIR is required');
  process.exit(1);
}

const { tasks: taskConfigs } = parseYaml(
  Fs.readFileSync(Path.join(evalsDir, 'ci', 'tasks.yaml'), 'utf-8')
) as { tasks?: Record<string, NightshiftEvalTaskConfig> };
if (!taskConfigs) {
  console.error('ci/tasks.yaml has no `tasks` mapping');
  process.exit(1);
}

const githubPrLabels = process.env.GITHUB_PR_LABELS ?? '';
const isPr = githubPrLabels !== '';
const selection = isPr
  ? parseNightshiftSelection(githubPrLabels)
  : parseNightshiftSelectionFromEnv(
      process.env.NIGHTSHIFT_EVAL_TASK ?? '',
      process.env.EVAL_MODEL_GROUPS ?? ''
    );

if (!selection) {
  console.error('No nightshift-evals task selected');
  process.exit(1);
}

const extraArgs = (process.env.NIGHTSHIFT_EVAL_ARGS ?? '').split(/\s+/).filter(Boolean);

console.log(
  buildNightshiftEvalSteps({
    tasks: selection.tasks === 'all' ? Object.keys(taskConfigs) : selection.tasks,
    connectorIds: selection.connectorIds,
    taskConfigs,
    extraArgs,
    // Only PR runs must not be silently re-run after a lost worker.
    preemptible: !isPr,
  })
);
