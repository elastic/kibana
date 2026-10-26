/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface CompletenessInput {
  /** Registered step ids from `GET /internal/workflows_extensions/step_definitions`. */
  endpointStepIds: string[];
  /** Registered trigger ids from `GET /internal/workflows_extensions/trigger_definitions`. */
  endpointTriggerIds: string[];
  /** Step `type` discriminators extracted from the produced schema. */
  schemaStepTypes: string[];
  /** Trigger `type` discriminators extracted from the produced schema. */
  schemaTriggerTypes: string[];
}

export interface CompletenessResult {
  /** Registered step ids missing from the produced schema. */
  missingSteps: string[];
  /** Registered trigger ids missing from the produced schema. */
  missingTriggers: string[];
  /** True when every registered id is present in the schema. */
  complete: boolean;
}

/**
 * Self-consistency check: every step/trigger the *same* Kibana reports as
 * registered must appear in the schema it produced. This catches the schema
 * dropping a registered definition (e.g. a composition bug), not registry ↔
 * approved-fixture parity (owned by the Scout approval tests).
 *
 * Direction is deliberately one-way (`endpoint ⊆ schema`): the schema legitimately
 * contains extra `type`s the definition endpoints do not list - built-in steps
 * (`if`/`foreach`/…), Actions-derived connector steps, and built-in triggers
 * (`alert`/`manual`/`scheduled`).
 */
export const checkCompleteness = (input: CompletenessInput): CompletenessResult => {
  const schemaSteps = new Set(input.schemaStepTypes);
  const schemaTriggers = new Set(input.schemaTriggerTypes);

  const missingSteps = input.endpointStepIds.filter((id) => !schemaSteps.has(id)).sort();
  const missingTriggers = input.endpointTriggerIds.filter((id) => !schemaTriggers.has(id)).sort();

  return {
    missingSteps,
    missingTriggers,
    complete: missingSteps.length === 0 && missingTriggers.length === 0,
  };
};
