/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowTemplateValues } from '../../types';

/** Template values for the watches that only persist autonomy so far. */
export interface PndWatchTemplateValues extends ManagedWorkflowTemplateValues {
  settingsVersion: number;
  autonomyLevel: 'manual' | 'assisted' | 'supervised';
}

/**
 * The slice every built-in watch is expected to persist, owned by the Common
 * Watch layer. Flattened here because template values are substituted as
 * scalars, so `autonomy` and the `triggers` object of the settings contract
 * arrive as `autonomyLevel`, `scheduleId`, and `allowManualRun`.
 */
export interface CommonWatchTemplateValues extends ManagedWorkflowTemplateValues {
  settingsVersion: number;
  autonomyLevel: 'manual' | 'assisted' | 'supervised';
  scheduleId: string;
  allowManualRun: boolean;
  scopes: Array<{ name: string; access: string; label: string }>;
}

/** Dark Watch extends the common slice with the dials only Dark exposes. */
export interface DarkWatchTemplateValues extends CommonWatchTemplateValues {
  inferenceEndpointId: string;
  tier2When: 'on_hits' | 'always';
  candidateLimit: number;
  fanOutMax: number;
  huntCooldownMinutes: number;
  targetTechnology: 'aws_iam' | 'fortigate';
}
