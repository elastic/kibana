/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PND_MANAGED_WORKFLOW_PLUGIN_ID, PND_WORKER_MANAGEMENT } from './constants';
import DARK_CONTINUOUS_THREAT_HUNT_YAML from './dark_continuous_threat_hunt.yaml';
import { type CommonWorkerTemplateValues, renderCommonWorkerYaml } from './worker_template_values';
import type { ManagedWorkflowDefinition } from '../../types';

export const PND_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID =
  'system-security-dark-continuous-threat-hunt';

export const PND_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW = {
  billable: false,
  id: PND_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  management: PND_WORKER_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 2,
  yamlTemplate: (values: CommonWorkerTemplateValues): string =>
    renderCommonWorkerYaml(DARK_CONTINUOUS_THREAT_HUNT_YAML, values),
} as const satisfies ManagedWorkflowDefinition<CommonWorkerTemplateValues>;
