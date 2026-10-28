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

export const ruleManagementSteps = (): readonly Step[] => [
  commandStep({
    ...securitySolutionCypressDefaults,
    command: '.buildkite/scripts/steps/functional/security_serverless_rule_management.sh',
    label: 'Serverless Rule Management - Security Solution Cypress Tests',
    key: 'security-serverless-rule-management',
    if: mainTargetBranchOnly,
    parallelism: 8,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command:
      '.buildkite/scripts/steps/functional/security_serverless_rule_management_prebuilt_rules_customization.sh',
    label:
      'Serverless Rule Management - Prebuilt Rules Customization - Security Solution Cypress Tests',
    key: 'security-serverless-rule-management-prebuilt-customization',
    if: mainTargetBranchOnly,
    parallelism: 1,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command:
      '.buildkite/scripts/steps/functional/security_serverless_rule_management_prebuilt_rules_installation.sh',
    label:
      'Serverless Rule Management - Prebuilt Rules Installation - Security Solution Cypress Tests',
    key: 'security-serverless-rule-management-prebuilt-installation',
    if: mainTargetBranchOnly,
    parallelism: 2,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command:
      '.buildkite/scripts/steps/functional/security_serverless_rule_management_prebuilt_rules_management.sh',
    label:
      'Serverless Rule Management - Prebuilt Rules Management - Security Solution Cypress Tests',
    key: 'security-serverless-rule-management-prebuilt-management',
    if: mainTargetBranchOnly,
    parallelism: 1,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command:
      '.buildkite/scripts/steps/functional/security_serverless_rule_management_prebuilt_rules_upgrade.sh',
    label: 'Serverless Rule Management - Prebuilt Rules Upgrade - Security Solution Cypress Tests',
    key: 'security-serverless-rule-management-prebuilt-upgrade',
    if: mainTargetBranchOnly,
    parallelism: 2,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command: '.buildkite/scripts/steps/functional/security_solution_rule_management.sh',
    label: 'Rule Management - Security Solution Cypress Tests',
    key: 'security-rule-management',
    parallelism: 6,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command:
      '.buildkite/scripts/steps/functional/security_solution_rule_management_prebuilt_rules_customization.sh',
    label: 'Rule Management - Prebuilt Rules Customization - Security Solution Cypress Tests',
    key: 'security-rule-management-prebuilt-customization',
    parallelism: 1,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command:
      '.buildkite/scripts/steps/functional/security_solution_rule_management_prebuilt_rules_installation.sh',
    label: 'Rule Management - Prebuilt Rules Installation - Security Solution Cypress Tests',
    key: 'security-rule-management-prebuilt-installation',
    parallelism: 1,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command:
      '.buildkite/scripts/steps/functional/security_solution_rule_management_prebuilt_rules_management.sh',
    label: 'Rule Management - Prebuilt Rules Management - Security Solution Cypress Tests',
    key: 'security-rule-management-prebuilt-management',
    parallelism: 1,
  }),
  commandStep({
    ...securitySolutionCypressDefaults,
    command:
      '.buildkite/scripts/steps/functional/security_solution_rule_management_prebuilt_rules_upgrade.sh',
    label: 'Rule Management - Prebuilt Rules Upgrade - Security Solution Cypress Tests',
    key: 'security-rule-management-prebuilt-upgrade',
    parallelism: 2,
  }),
];
