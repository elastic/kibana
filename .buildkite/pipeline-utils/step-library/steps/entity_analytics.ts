/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../helpers.ts';
import { mainTargetBranchOnly, securitySolutionCypressDefaults } from '../presets.ts';
import type { Step } from '../types.ts';

export const entityAnalyticsSteps = (): readonly Step[] => [
  commandStep({
    ...securitySolutionCypressDefaults,
    command: '.buildkite/scripts/steps/functional/security_serverless_entity_analytics.sh',
    label: 'Serverless Entity Analytics - Security Cypress Tests',
    key: 'security-serverless-entity-analytics',
    if: mainTargetBranchOnly,
    parallelism: 2,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command: '.buildkite/scripts/steps/functional/security_solution_entity_analytics.sh',
    label: 'Entity Analytics - Security Solution Cypress Tests',
    key: 'security-entity-analytics',
    parallelism: 2,
  }),
];
