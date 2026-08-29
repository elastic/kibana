/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PND_MANAGED_WORKFLOW_PLUGIN_ID,
  PND_WATCH_MANAGEMENT,
  PND_WATCH_VISIBILITY,
} from './constants';
import WATCH_ATTACK_DISCOVERY_GENERATION_YAML from './watch_attack_discovery_generation.yaml';
import type { PndAdGenerationTemplateValues } from './watch_template_values';
import type { ManagedWorkflowDefinition } from '../../types';

export const PND_WATCH_ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID =
  'system-security-watch-attack-discovery-generation';

/**
 * The Attack Discovery Generation worker: a per-space catalog watch whose only
 * job is scheduled AD generation. Investigation and response live in the Watch
 * Floor, which each persisted discovery wakes via security.attackDiscoveryCreated.
 * Schedule cadence and generation options are template values, so the watch
 * settings page can rewrite them without a YAML edit.
 */
export const PND_WATCH_ATTACK_DISCOVERY_GENERATION_WORKFLOW = {
  billable: false,
  id: PND_WATCH_ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  management: PND_WATCH_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 1,
  visibility: PND_WATCH_VISIBILITY,
  yamlTemplate: ({
    settingsVersion,
    autonomyLevel,
    scheduleEvery,
    alertSize,
    lookback,
    connectorId,
  }: PndAdGenerationTemplateValues): string =>
    WATCH_ATTACK_DISCOVERY_GENERATION_YAML.replaceAll(
      '__WATCH_SETTINGS_VERSION__',
      String(settingsVersion)
    )
      .replaceAll('__WATCH_AUTONOMY_LEVEL__', autonomyLevel)
      .replaceAll('__AD_SCHEDULE_EVERY__', scheduleEvery)
      .replaceAll('__AD_ALERT_SIZE__', String(alertSize))
      .replaceAll('__AD_LOOKBACK__', lookback)
      .replaceAll('__AD_CONNECTOR_ID__', connectorId),
} as const satisfies ManagedWorkflowDefinition<PndAdGenerationTemplateValues>;
