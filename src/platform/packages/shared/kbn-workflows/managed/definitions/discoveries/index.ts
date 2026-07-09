/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ALERT_RETRIEVAL_YAML from './alert_retrieval.yaml';
import CUSTOM_VALIDATION_EXAMPLE_YAML from './custom_validation_example.yaml';
import GENERATION_YAML from './generation.yaml';
import RUN_EXAMPLE_YAML from './run_example.yaml';
import SKILL_ALERT_RETRIEVAL_YAML from './skill_alert_retrieval.yaml';
import SKILL_REPORT_YAML from './skill_report.yaml';
import VALIDATE_YAML from './validate.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

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
  version: 1,
  yaml: ALERT_RETRIEVAL_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 11,
  yaml: SKILL_ALERT_RETRIEVAL_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 2,
  yaml: SKILL_REPORT_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_GENERATION_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 1,
  yaml: GENERATION_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_VALIDATE_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 2,
  yaml: VALIDATE_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 2,
  yaml: RUN_EXAMPLE_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW = {
  billable: false,
  id: ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  management: MANAGEMENT,
  pluginId: 'discoveries',
  version: 2,
  yaml: CUSTOM_VALIDATION_EXAMPLE_YAML,
} as const satisfies ManagedWorkflowDefinition;
