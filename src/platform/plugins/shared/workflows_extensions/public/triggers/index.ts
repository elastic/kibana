/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { workflowExecutionFailedTriggerDefinition } from '../../common/triggers/workflow_execution_failed_trigger';
import { casesUpdateTriggerDefinition } from '../../common/triggers/cases_update_trigger';
import type { PublicTriggerRegistry } from '../trigger_registry';

/**
 * Register internal trigger definitions on the public side.
 * These triggers are provided by the workflows extensions plugin itself.
 */
export const registerInternalTriggers = (triggerRegistry: PublicTriggerRegistry) => {
  try {
    triggerRegistry.register(workflowExecutionFailedTriggerDefinition);
    triggerRegistry.register(casesUpdateTriggerDefinition);
  } catch (error) {
    console.error('[registerInternalTriggers] Failed to register trigger:', error);
    throw error;
  }
};
