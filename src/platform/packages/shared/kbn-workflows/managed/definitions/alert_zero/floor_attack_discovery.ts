/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERT_ZERO_MANAGED_WORKFLOW_PLUGIN_ID, ALERT_ZERO_WORKER_MANAGEMENT } from './constants';
import FLOOR_ATTACK_DISCOVERY_YAML from './floor_attack_discovery.yaml';
import {
  renderScheduledWorkerYaml,
  type ScheduledWorkerTemplateValues,
} from './worker_template_values';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERT_ZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID =
  'system-security-floor-attack-discovery';

export const ALERT_ZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW = {
  billable: false,
  id: ALERT_ZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
  management: ALERT_ZERO_WORKER_MANAGEMENT,
  pluginId: ALERT_ZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yamlTemplate: (values: ScheduledWorkerTemplateValues): string =>
    renderScheduledWorkerYaml(FLOOR_ATTACK_DISCOVERY_YAML, values),
} as const satisfies ManagedWorkflowDefinition<ScheduledWorkerTemplateValues>;
