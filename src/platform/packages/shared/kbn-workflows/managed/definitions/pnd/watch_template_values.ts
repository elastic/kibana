/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowTemplateValues } from '../../types';

/**
 * Shared template values for PND watches that only template autonomy today
 * (Floor, Officer, Deep, Detection).
 */
export interface PndWatchTemplateValues extends ManagedWorkflowTemplateValues {
  settingsVersion: number;
  autonomyLevel: 'manual' | 'assisted' | 'supervised';
}

/**
 * CWL-owned common slice (RFC). Local stub until CWL exports the shared type.
 * Template values use `autonomyLevel` to match the PND PATCH / Floor install path;
 * `toSettings` maps it to API `autonomy`.
 */
export interface CommonWatchSettings {
  autonomy: 'manual' | 'assisted' | 'supervised';
  triggers: {
    scheduleId: string;
    allowManualRun: boolean;
  };
  scopes: DarkWatchScope[];
}

export interface DarkWatchScope {
  name: string;
  access: string;
  label: string;
}

export type DarkWatchTier2When = 'on_hits' | 'always';
export type DarkWatchTargetTechnology = 'aws_iam' | 'fortigate';

/** Dark-owned extension of CommonWatchSettings (RFC). */
export interface DarkWatchSettings extends CommonWatchSettings {
  settingsVersion: number;
  connectorId: string;
  tier2When: DarkWatchTier2When;
  candidateLimit: number;
  fanOutMax: number;
  scheduleEveryMinutes: number;
  targetTechnology: DarkWatchTargetTechnology;
  leadPollIntervalMinutes: number;
  leadMinPriority: number;
  intelEventTriggerEnabled: boolean;
}

/**
 * Values persisted as managedTemplateValues and passed to Dark's yamlTemplate.
 * Uses autonomyLevel (Floor/PATCH naming) rather than autonomy.
 */
export interface DarkWatchTemplateValues extends ManagedWorkflowTemplateValues {
  settingsVersion: number;
  autonomyLevel: DarkWatchSettings['autonomy'];
  scheduleId: string;
  allowManualRun: boolean;
  scopes: DarkWatchScope[];
  connectorId: string;
  tier2When: DarkWatchTier2When;
  candidateLimit: number;
  fanOutMax: number;
  scheduleEveryMinutes: number;
  targetTechnology: DarkWatchTargetTechnology;
  leadPollIntervalMinutes: number;
  leadMinPriority: number;
  intelEventTriggerEnabled: boolean;
}
