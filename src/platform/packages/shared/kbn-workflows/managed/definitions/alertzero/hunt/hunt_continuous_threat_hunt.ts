/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import HUNT_CONTINUOUS_THREAT_HUNT_YAML from './hunt_continuous_threat_hunt.yaml';
import { type HuntWorkerTemplateValues, renderHuntWorkerYaml } from './hunt_worker_template';
import type { ManagedWorkflowDefinition } from '../../../types';
import { ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID, ALERTZERO_WORKER_MANAGEMENT } from '../constants';
import {
  CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS,
  upgradeStoredWorkerSettings,
} from '../worker_settings_defaults';

export const ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID =
  'system-security-hunt-continuous-threat-hunt';

export const ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW = {
  billable: false,
  id: ALERTZERO_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  management: ALERTZERO_WORKER_MANAGEMENT,
  pluginId: ALERTZERO_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 6,
  yamlTemplate: (values: HuntWorkerTemplateValues): string =>
    renderHuntWorkerYaml(
      HUNT_CONTINUOUS_THREAT_HUNT_YAML,
      upgradeStoredWorkerSettings(CONTINUOUS_THREAT_HUNT_WORKER_SETTINGS_DEFAULTS, values)
    ),
} as const satisfies ManagedWorkflowDefinition<HuntWorkerTemplateValues>;
