/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep, withAgentOverrides } from '../helpers.ts';
import { mainTargetBranchOnly, securitySolutionHighMemoryCypressDefaults } from '../presets.ts';
import type { Step } from '../types.ts';

export const defendWorkflowsSteps = (): readonly Step[] => [
  commandStep({
    ...withAgentOverrides(securitySolutionHighMemoryCypressDefaults, {
      enableNestedVirtualization: true,
    }),
    command: '.buildkite/scripts/steps/functional/defend_workflows.sh',
    label: 'Defend Workflows Cypress Tests',
    key: 'defend-workflows',
    parallelism: 24,
  }),
  commandStep({
    ...withAgentOverrides(securitySolutionHighMemoryCypressDefaults, {
      enableNestedVirtualization: true,
    }),
    command: '.buildkite/scripts/steps/functional/defend_workflows_serverless.sh',
    label: 'Defend Workflows Cypress Tests on Serverless',
    key: 'defend-workflows-serverless',
    if: mainTargetBranchOnly,
    parallelism: 16,
  }),
];
