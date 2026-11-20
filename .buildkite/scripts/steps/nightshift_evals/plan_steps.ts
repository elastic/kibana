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
import {
  getNightshiftEvalSteps,
  isPreemptibleEnabled,
  parseNightshiftTasks,
} from '../../../pipelines/nightshift_evals/nightshift_evals_pipeline.ts';

const evalsDir = process.env.NIGHTSHIFT_EVALS_DIR;
if (!evalsDir) {
  console.error('NIGHTSHIFT_EVALS_DIR is required');
  process.exit(1);
}

try {
  const tasks = parseNightshiftTasks(
    Fs.readFileSync(Path.join(evalsDir, 'ci', 'tasks.yaml'), 'utf-8')
  );
  console.log(
    ['steps:', getNightshiftEvalSteps({ tasks, preemptible: isPreemptibleEnabled() })].join('\n')
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
