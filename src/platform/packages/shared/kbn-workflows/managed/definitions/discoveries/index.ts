/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from '../../types';
import { readManagedWorkflowYaml } from '../read_managed_workflow_yaml';

export const ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID =
  'system-attack-discovery-alert-retrieval';
export const ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID =
  'system-attack-discovery-skill-alert-retrieval';
export const ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID = 'system-attack-discovery-skill-report';
export const ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID = 'system-attack-discovery-generation';
export const ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID = 'system-attack-discovery-validate';
export const ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID = 'system-attack-discovery-run-example';
export const ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID =
  'system-attack-discovery-custom-validation-example';

const MANAGEMENT = {
  enablement: 'enforced',
  lifecycle: 'static',
  versionStrategy: 'auto',
} as const;

export const ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 2,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'alert_retrieval.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 13,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'skill_alert_retrieval.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 4,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'skill_report.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_GENERATION_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 3,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'generation.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_VALIDATE_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 4,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'validate.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 4,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'run_example.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 4,
  get yaml() {
    return readManagedWorkflowYaml(__dirname, 'custom_validation_example.yaml');
  },
} as const satisfies ManagedWorkflowDefinition;
