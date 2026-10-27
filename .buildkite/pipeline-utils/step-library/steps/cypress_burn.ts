/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep, withAgentOverrides } from '../helpers.ts';
import { mainTargetBranchOnly, securitySolutionCypressDefaults } from '../presets.ts';
import type { Step } from '../types.ts';

export const cypressBurnSteps = (): readonly Step[] => [
  commandStep({
    ...withAgentOverrides(securitySolutionCypressDefaults, { enableNestedVirtualization: true }),
    command: '.buildkite/scripts/steps/functional/defend_workflows_burn.sh',
    label: '[Soft fail] Defend Workflows Cypress Tests, burning changed specs',
    key: 'defend-workflows-burn',
    soft_fail: true,
    retry: { automatic: false },
    parallelism: 1,
  }),
  commandStep({
    ...withAgentOverrides(securitySolutionCypressDefaults, { enableNestedVirtualization: true }),
    command: '.buildkite/scripts/steps/functional/defend_workflows_serverless_burn.sh',
    label: '[Soft fail] Defend Workflows Cypress Tests on Serverless, burning changed specs',
    key: 'defend-workflows-serverless-burn',
    if: mainTargetBranchOnly,
    soft_fail: true,
    retry: { automatic: false },
    parallelism: 1,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command: '.buildkite/scripts/steps/functional/security_solution_burn.sh',
    label: '[Soft fail] Security Solution Cypress tests, burning changed specs',
    key: 'security-solution-burn',
    soft_fail: true,
    retry: { automatic: false },
    parallelism: 1,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command: '.buildkite/scripts/steps/functional/osquery_cypress_burn.sh',
    label: '[Soft fail] Osquery Cypress Tests, burning changed specs',
    key: 'osquery-cypress-burn',
    timeout_in_minutes: 50,
    soft_fail: true,
    retry: { automatic: false },
  }),
];
