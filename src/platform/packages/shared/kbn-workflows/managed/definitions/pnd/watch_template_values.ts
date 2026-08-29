/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowTemplateValues } from '../../types';

export interface PndWatchTemplateValues extends ManagedWorkflowTemplateValues {
  settingsVersion: number;
  autonomyLevel: 'manual' | 'assisted' | 'supervised';
}

/**
 * Template values for the Attack Discovery Generation watch: the shared watch
 * settings plus the schedule cadence and generation options its settings page
 * writes. `scheduleEvery` is a workflows `scheduled` trigger interval (e.g.
 * `15m`); an empty `connectorId` means "server-resolved default AI connector".
 */
export interface PndAdGenerationTemplateValues extends PndWatchTemplateValues {
  scheduleEvery: string;
  alertSize: number;
  lookback: string;
  connectorId: string;
}
