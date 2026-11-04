/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DATADOG_ALERT_TRANSLATION_YAML from './datadog_alert_translation.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const DATADOG_ALERT_TRANSLATION_WORKFLOW_ID = 'system-datadog-alert-translation';

export const DATADOG_ALERT_TRANSLATION_WORKFLOW = {
  id: DATADOG_ALERT_TRANSLATION_WORKFLOW_ID,
  pluginId: 'alertingVTwo',
  version: 1,
  billable: false,
  yaml: DATADOG_ALERT_TRANSLATION_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition;
