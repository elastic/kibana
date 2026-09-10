/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID, ALERTZERO_WORKER_MANAGEMENT } from './constants';
import HUNT_CONTINUOUS_THREAT_HUNT_YAML from './hunt_continuous_threat_hunt.yaml';
import {
  renderScheduledWorkerYaml,
  type ScheduledWorkerTemplateValues,
} from './worker_template_values';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID =
  'system-security-hunt-continuous-threat-hunt';

export const ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW = {
  billable: false,
  id: ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  management: ALERTZERO_WORKER_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 4,
  yamlTemplate: (values: ScheduledWorkerTemplateValues): string =>
    renderScheduledWorkerYaml(HUNT_CONTINUOUS_THREAT_HUNT_YAML, values),
} as const satisfies ManagedWorkflowDefinition<ScheduledWorkerTemplateValues>;
