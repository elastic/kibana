/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DETECTION_ENGINE_YAML from './detection_engine.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const SIGNIFICANT_EVENTS_DETECTION_ENGINE_WORKFLOW_ID =
  'system-significant-events-detection-engine';

/**
 * Schedules the Significant Events detection engine in one space. Installed per space, with the
 * space id as suffix, when someone turns auto-run on; the engine itself does the work behind the
 * internal route, and holds a per-space lease so a manual run never overlaps a scheduled one.
 */
export const SIGNIFICANT_EVENTS_DETECTION_ENGINE_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_DETECTION_ENGINE_WORKFLOW_ID,
  pluginId: 'significantEventsDetectionEngine',
  version: 1,
  billable: false,
  yaml: DETECTION_ENGINE_YAML,
  // Created and enabled on demand per space; the stored `enabled` survives upgrades.
  management: { lifecycle: 'dynamic', versionStrategy: 'auto', enablement: 'restorable' },
} as const satisfies ManagedWorkflowDefinition;
