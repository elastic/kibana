/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { preprocessAlertInputs } from './preprocess_alert_inputs';
import { preprocessDocumentInputs } from './preprocess_document_inputs';
import { WorkflowTriggerInputError } from '../../../workflow_trigger_input_error';
import type { AlertPreprocessingContext } from '../../../workflows_management_api';

/** The compact selections the server knows how to expand, named after their `event` key. */
export type TriggerSelectionKind = 'alertIds' | 'documentIds';

export const ALL_TRIGGER_SELECTION_KINDS: readonly TriggerSelectionKind[] = [
  'alertIds',
  'documentIds',
];

/**
 * Upper bound on the serialized `event` after expansion. The expanded event is persisted on the
 * execution document, so it is held to the same default the execution engine applies to a single
 * step's output (`DEFAULT_MAX_STEP_SIZE`).
 */
export const MAX_EXPANDED_EVENT_BYTES = 10 * 1024 * 1024;

const assertWithinExpandedEventBudget = (event: unknown): void => {
  const bytes = Buffer.byteLength(JSON.stringify(event) ?? '', 'utf8');
  if (bytes > MAX_EXPANDED_EVENT_BYTES) {
    throw new WorkflowTriggerInputError(
      `The selection expands to ${bytes} bytes, above the ${MAX_EXPANDED_EVENT_BYTES}-byte limit for a workflow run. Select fewer alerts or documents.`
    );
  }
};

/**
 * Expands the compact trigger selections named in `expand` into the event shape workflows
 * consume.
 *
 * Each step inspects `event.triggerType` and returns `inputs` untouched when it does not apply,
 * so this is safe to call unconditionally for every run. A caller that validates selections
 * itself (e.g. Cases) passes only the kinds it has validated, so a kind added here later is not
 * expanded on its behalf.
 */
export async function preprocessTriggerInputs(
  inputs: Record<string, unknown>,
  context: AlertPreprocessingContext,
  spaceId: string,
  logger: Logger,
  expand: readonly TriggerSelectionKind[] = ALL_TRIGGER_SELECTION_KINDS
): Promise<Record<string, unknown>> {
  const withExpandedAlerts = expand.includes('alertIds')
    ? await preprocessAlertInputs(inputs, context, spaceId, logger)
    : inputs;
  const expanded = expand.includes('documentIds')
    ? await preprocessDocumentInputs(withExpandedAlerts, context, logger)
    : withExpandedAlerts;

  if (expanded !== inputs) {
    assertWithinExpandedEventBudget(expanded.event);
  }

  return expanded;
}
