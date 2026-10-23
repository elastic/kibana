/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../helpers.ts';
import { retry, spotAgent, spotZones } from '../presets.ts';
import type { Step } from '../types.ts';

// A PR opts in by carrying this label; without it the step is not added to the build at all.
export const EVALS_SUGGESTIONS_LABEL = 'ci:evals-suggestions';

// Suggests the eval suites related to the changed files. Opting in with the label is what allows the
// step to post a comment on the PR; otherwise it only annotates the build.
export const evalsSuggestions = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/evals/suggest_evals.sh',
    label: 'Suggest Evals',
    key: 'evals-suggestions',
    agents: spotAgent('n2-standard-2', spotZones.centralFCA),
    env: { EVALS_SUGGESTIONS_MODE: 'comment' },
    soft_fail: true,
    timeout_in_minutes: 10,
    retry: retry.agentLossOrAnyOnce,
  }),
];
