/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../../helpers.ts';
import { mainTargetBranchOnly, securitySolutionCypressDefaults } from '../../presets.ts';
import type { Step } from '../../types.ts';

export const detectionEngineSteps = (): readonly Step[] => [
  commandStep({
    ...securitySolutionCypressDefaults,
    command: '.buildkite/scripts/steps/functional/security_serverless_detection_engine.sh',
    label: 'Serverless Detection Engine - Security Solution Cypress Tests',
    key: 'security-serverless-detection-engine',
    if: mainTargetBranchOnly,
    parallelism: 8,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command:
      '.buildkite/scripts/steps/functional/security_serverless_detection_engine_exceptions.sh',
    label: 'Serverless Detection Engine - Exceptions - Security Solution Cypress Tests',
    key: 'security-serverless-detection-engine-exceptions',
    if: mainTargetBranchOnly,
    parallelism: 3,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command: '.buildkite/scripts/steps/functional/security_solution_detection_engine.sh',
    label: 'Detection Engine - Security Solution Cypress Tests',
    key: 'security-detection-engine',
    parallelism: 7,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command: '.buildkite/scripts/steps/functional/security_solution_detection_engine_exceptions.sh',
    label: 'Detection Engine - Exceptions - Security Solution Cypress Tests',
    key: 'security-detection-engine-exceptions',
    parallelism: 2,
  }),
];
