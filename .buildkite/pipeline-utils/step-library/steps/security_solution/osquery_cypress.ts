/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../../helpers.ts';
import { mainTargetBranchOnly, securitySolutionHighMemoryCypressDefaults } from '../../presets.ts';
import type { Step } from '../../types.ts';

export const osqueryCypressSteps = (): readonly Step[] => [
  commandStep({
    ...securitySolutionHighMemoryCypressDefaults,
    command: '.buildkite/scripts/steps/functional/osquery_cypress.sh',
    label: 'Osquery Cypress Tests',
    key: 'osquery-cypress',
    parallelism: 4,
  }),
  commandStep({
    ...securitySolutionHighMemoryCypressDefaults,
    command: '.buildkite/scripts/steps/functional/security_serverless_osquery.sh',
    label: 'Osquery Cypress Tests on Serverless',
    key: 'osquery-serverless',
    if: mainTargetBranchOnly,
    parallelism: 3,
  }),
];
