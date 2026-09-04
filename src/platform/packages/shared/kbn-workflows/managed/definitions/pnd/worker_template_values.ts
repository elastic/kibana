/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowTemplateValues } from '../../types';

export interface CommonWorkerTemplateValues extends ManagedWorkflowTemplateValues {
  settingsVersion: number;
  autonomyLevel: 'manual' | 'assisted' | 'supervised';
}

export const renderCommonWorkerYaml = (
  yaml: string,
  { settingsVersion, autonomyLevel }: CommonWorkerTemplateValues
): string =>
  yaml
    .replaceAll('__WORKER_SETTINGS_VERSION__', String(settingsVersion))
    .replaceAll('__WORKER_AUTONOMY_LEVEL__', autonomyLevel);
