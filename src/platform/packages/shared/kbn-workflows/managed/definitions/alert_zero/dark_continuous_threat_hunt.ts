/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ALERT_ZERO_MANAGED_WORKFLOW_PLUGIN_ID, ALERT_ZERO_WORKER_MANAGEMENT } from './constants';
import DARK_CONTINUOUS_THREAT_HUNT_YAML from './dark_continuous_threat_hunt.yaml';
import { type CommonWorkerTemplateValues, renderCommonWorkerYaml } from './worker_template_values';
import type { ManagedWorkflowDefinition } from '../../types';

export const ALERT_ZERO_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID =
  'system-security-dark-continuous-threat-hunt';

export const ALERT_ZERO_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW = {
  billable: false,
  id: ALERT_ZERO_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  management: ALERT_ZERO_WORKER_MANAGEMENT,
  pluginId: ALERT_ZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yamlTemplate: (values: CommonWorkerTemplateValues): string =>
    renderCommonWorkerYaml(DARK_CONTINUOUS_THREAT_HUNT_YAML, values),
} as const satisfies ManagedWorkflowDefinition<CommonWorkerTemplateValues>;
