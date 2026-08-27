/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PND_MANAGED_WORKFLOW_PLUGIN_ID, PND_WATCH_MANAGEMENT } from './constants';
import WATCH_DARK_YAML from './watch_dark.yaml';
import { darkWatchScheduleEvery } from './watch_dark_schedule';
import type { DarkWatchTemplateValues } from './watch_template_values';
import type { ManagedWorkflowDefinition } from '../../types';

export const PND_WATCH_DARK_WORKFLOW_ID = 'system-security-watch-dark';

const renderPndWatchDarkYaml = ({
  settingsVersion,
  autonomyLevel,
  scheduleId,
  allowManualRun,
  scopes,
  inferenceEndpointId,
  tier2When,
  candidateLimit,
  fanOutMax,
  huntCooldownMinutes,
}: DarkWatchTemplateValues): string =>
  // `scheduleId` is the selected option id; its scheduled-trigger interval is
  // resolved from the catalog (default cadence on an unrecognized id).
  WATCH_DARK_YAML.replaceAll('__WATCH_SETTINGS_VERSION__', String(settingsVersion))
    .replaceAll('__WATCH_AUTONOMY_LEVEL__', autonomyLevel)
    .replaceAll('__WATCH_SCHEDULE_ID__', scheduleId)
    .replaceAll('__WATCH_SCHEDULE_EVERY__', darkWatchScheduleEvery(scheduleId))
    .replaceAll('__WATCH_ALLOW_MANUAL_RUN__', String(allowManualRun))
    .replaceAll('__WATCH_SCOPES_JSON__', JSON.stringify(scopes))
    .replaceAll('__WATCH_INFERENCE_ENDPOINT_ID__', inferenceEndpointId)
    .replaceAll('__WATCH_TIER2_WHEN__', tier2When)
    .replaceAll('__WATCH_CANDIDATE_LIMIT__', String(candidateLimit))
    .replaceAll('__WATCH_FAN_OUT_MAX__', String(fanOutMax))
    .replaceAll('__WATCH_HUNT_COOLDOWN_MINUTES__', String(huntCooldownMinutes));

export const PND_WATCH_DARK_WORKFLOW = {
  billable: false,
  id: PND_WATCH_DARK_WORKFLOW_ID,
  management: PND_WATCH_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  yamlTemplate: renderPndWatchDarkYaml,
} as const satisfies ManagedWorkflowDefinition<DarkWatchTemplateValues>;
