/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from './schema';
import { isManualTrigger, type WorkflowInput } from './schema/triggers/manual_trigger_schema';

export const getInputsFromDefinition = (
  definition: WorkflowYaml | Partial<WorkflowYaml> | undefined | null
): WorkflowInput | undefined => {
  const manualTriggerInDefinition = definition?.triggers?.find((trigger) =>
    isManualTrigger(trigger)
  );
  let inputsInDefinition = manualTriggerInDefinition?.inputs;

  if (!inputsInDefinition) {
    // Backward compatibility with workflows that still use root-level inputs
    inputsInDefinition = (definition as Record<string, unknown>)?.inputs as WorkflowInput;
  }

  return inputsInDefinition;
};
