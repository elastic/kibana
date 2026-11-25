/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { genericStep, waitStep } from '../helpers.ts';
import { k8sMinimalAgent } from '../presets.ts';
import type { Step } from '../types.ts';

export const postBuildSteps = (): readonly Step[] => [
  waitStep({ continue_on_failure: true }),
  // The post-build command has no key, so it cannot use commandStep.
  genericStep({
    command: '.buildkite/scripts/lifecycle/post_build.sh',
    label: 'Post-Build',
    agents: k8sMinimalAgent(),
    plugins: [
      {
        'sparse-checkout#v1.6.0': {
          paths: ['.buildkite', '.nvmrc', 'package.json', 'tsconfig.base.json', 'versions.json'],
          cleanup_sparse_state: true,
        },
      },
    ],
  }),
];
