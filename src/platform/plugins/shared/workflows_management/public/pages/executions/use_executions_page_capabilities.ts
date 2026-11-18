/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import {
  EXECUTIONS_READ_ONLY,
  useWorkflowPrototypeScenario,
} from '../../shared/workflow_prototype_scenario';

/**
 * Prototype override for the Executions read-only dropdown item.
 * Reading stays allowed. Running, editing, and cancelling do not.
 */
export const useExecutionsPageCapabilities = () => {
  const capabilities = useWorkflowsCapabilities();
  const scenario = useWorkflowPrototypeScenario();

  if (scenario !== EXECUTIONS_READ_ONLY) {
    return capabilities;
  }

  return {
    ...capabilities,
    canExecuteWorkflow: false,
    canUpdateWorkflow: false,
    canCancelWorkflowExecution: false,
  };
};
