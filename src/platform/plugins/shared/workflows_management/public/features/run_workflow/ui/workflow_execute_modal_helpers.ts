/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import type { normalizeFieldsToJsonSchema } from '@kbn/workflows/spec/lib/field_conversion';
import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import type { WorkflowTriggerTab } from './types';

export type NormalizedWorkflowInputs = ReturnType<typeof normalizeFieldsToJsonSchema>;

/** True when normalized workflow inputs define at least one field. */
export function hasWorkflowInputFields(normalized?: NormalizedWorkflowInputs): boolean {
  const props = normalized?.properties;
  return Boolean(props && Object.keys(props).length > 0);
}

/** True when the RAC alerts index API failed due to missing `rac` / auth. */
export function isRacAlertsApiForbiddenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const e = error as {
    response?: { status?: number };
    body?: { statusCode?: number; message?: string };
    message?: string;
  };

  if (e.response?.status === 403 || e.body?.statusCode === 403) {
    return true;
  }

  const msg =
    typeof e.body?.message === 'string'
      ? e.body.message
      : typeof e.message === 'string'
      ? e.message
      : '';

  return (
    msg.includes('privileges [rac]') ||
    msg.includes('Kibana privileges [rac]') ||
    msg.includes('/internal/rac/alerts')
  );
}

export function getDefaultTrigger(definition: WorkflowYaml | null): WorkflowTriggerTab {
  if (!definition) {
    return 'alert';
  }

  const normalizedInputs = getInputsFromDefinition(definition);

  if (normalizedInputs && hasWorkflowInputFields(normalizedInputs)) {
    return 'manual';
  }
  return 'alert';
}

export function getFallbackTriggerTab(
  normalizedInputs: NormalizedWorkflowInputs | undefined
): WorkflowTriggerTab {
  return hasWorkflowInputFields(normalizedInputs) ? 'manual' : 'index';
}

export function resolveInitialSelectedTrigger(
  definition: WorkflowYaml | null,
  initialExecutionId: string | undefined,
  hasAlertRacAccess: boolean,
  canReadWorkflowExecution: boolean,
  normalizedInputs: NormalizedWorkflowInputs | undefined
): WorkflowTriggerTab {
  if (initialExecutionId) {
    return canReadWorkflowExecution ? 'historical' : getFallbackTriggerTab(normalizedInputs);
  }

  const hasAlertTrigger = Boolean(definition?.triggers?.some((t) => t.type === 'alert'));

  if (hasAlertTrigger) {
    return hasAlertRacAccess ? 'alert' : getFallbackTriggerTab(normalizedInputs);
  }

  if (hasWorkflowInputFields(normalizedInputs)) {
    return getFallbackTriggerTab(normalizedInputs);
  }

  const preferred = getDefaultTrigger(definition);
  if (preferred === 'alert' && !hasAlertRacAccess) {
    return getFallbackTriggerTab(normalizedInputs);
  }
  return preferred;
}
