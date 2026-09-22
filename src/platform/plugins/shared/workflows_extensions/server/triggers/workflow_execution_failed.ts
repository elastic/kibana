/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  commonWorkflowExecutionFailedTriggerDefinition,
  WORKFLOW_EXECUTION_FAILED_TRIGGER_ID,
  workflowExecutionFailedEventSchema,
} from '../../common/triggers/workflow_execution_failed';
import type { ServerTriggerDefinition } from '../types';

export { WORKFLOW_EXECUTION_FAILED_TRIGGER_ID, workflowExecutionFailedEventSchema };
export type { WorkflowExecutionFailedEvent } from '../../common/triggers/workflow_execution_failed';

export const workflowExecutionFailedTriggerDefinition: ServerTriggerDefinition = {
  ...commonWorkflowExecutionFailedTriggerDefinition,
};
