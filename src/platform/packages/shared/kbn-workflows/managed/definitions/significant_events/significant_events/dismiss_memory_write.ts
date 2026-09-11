/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DISMISS_MEMORY_WRITE_YAML from './dismiss_memory_write.yaml';
import type { ManagedWorkflowDefinition } from '../../../types';

export const SIGNIFICANT_EVENTS_DISMISS_MEMORY_WRITE_WORKFLOW_ID =
  'system-significant-events-dismiss-memory-write';

export const SIGNIFICANT_EVENTS_DISMISS_MEMORY_WRITE_WORKFLOW = {
  id: SIGNIFICANT_EVENTS_DISMISS_MEMORY_WRITE_WORKFLOW_ID,
  pluginId: 'significantEvents',
  version: 1,
  billable: false,
  yaml: DISMISS_MEMORY_WRITE_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
