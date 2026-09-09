/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PND_MANAGED_WORKFLOW_PLUGIN_ID, PND_RULE_WORKFLOW_MANAGEMENT } from './constants';
import DETECTION_PICKUP_COVERAGE_KIS_YAML from './detection_pickup_coverage_kis.yaml';
import HUNT_WRITE_COVERAGE_KI_YAML from './hunt_write_coverage_ki.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const PND_HUNT_WRITE_COVERAGE_KI_WORKFLOW_ID = 'system-security-hunt-write-coverage-ki';
export const PND_DETECTION_PICKUP_COVERAGE_KIS_WORKFLOW_ID =
  'system-security-detection-pickup-coverage-kis';

export const PND_HUNT_WRITE_COVERAGE_KI_WORKFLOW = {
  billable: false,
  id: PND_HUNT_WRITE_COVERAGE_KI_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: HUNT_WRITE_COVERAGE_KI_YAML,
} as const satisfies ManagedWorkflowDefinition;

export const PND_DETECTION_PICKUP_COVERAGE_KIS_WORKFLOW = {
  billable: false,
  id: PND_DETECTION_PICKUP_COVERAGE_KIS_WORKFLOW_ID,
  management: PND_RULE_WORKFLOW_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yaml: DETECTION_PICKUP_COVERAGE_KIS_YAML,
} as const satisfies ManagedWorkflowDefinition;
