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
import WATCH_FLOOR_YAML from './watch_floor.yaml';
import type { PndWatchTemplateValues } from './watch_template_values';
import type { ManagedWorkflowDefinition } from '../../types';

export const PND_WATCH_FLOOR_WORKFLOW_ID = 'system-security-watch-floor';

export const PND_WATCH_FLOOR_WORKFLOW = {
  billable: false,
  id: PND_WATCH_FLOOR_WORKFLOW_ID,
  management: PND_WATCH_MANAGEMENT,
  pluginId: PND_MANAGED_WORKFLOW_PLUGIN_ID,
  version: 22,
  visibility: PND_WATCH_VISIBILITY,
  yamlTemplate: ({ settingsVersion, autonomyLevel }: PndWatchTemplateValues): string =>
    WATCH_FLOOR_YAML.replaceAll('__WATCH_SETTINGS_VERSION__', String(settingsVersion)).replaceAll(
      '__WATCH_AUTONOMY_LEVEL__',
      autonomyLevel
    ),
} as const satisfies ManagedWorkflowDefinition<PndWatchTemplateValues>;
