/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Query } from '@kbn/es-query';
import type { WorkflowYaml } from '@kbn/workflows';
import { isTriggerType } from '@kbn/workflows';
import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import type { WorkflowTriggerTab } from './types';

export type NormalizedWorkflowInputs = JsonModelSchemaType | undefined;

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

export function hasCustomEventTrigger(definition: WorkflowYaml | null): boolean {
  if (!definition?.triggers?.length) {
    return false;
  }

  for (const trigger of definition.triggers) {
    if (trigger && typeof trigger === 'object' && 'type' in trigger) {
      const type = (trigger as { type: unknown }).type;
      if (typeof type === 'string' && !isTriggerType(type)) {
        return true;
      }
    }
  }

  return false;
}

export function getWorkflowCustomTriggerTypeIds(definition: WorkflowYaml | null): string[] {
  if (!definition?.triggers?.length) {
    return [];
  }

  const ids = new Set<string>();
  const orderedUnique: string[] = [];
  for (const trigger of definition.triggers) {
    if (trigger && typeof trigger === 'object' && 'type' in trigger) {
      const type = (trigger as { type: unknown }).type;
      if (typeof type === 'string' && !isTriggerType(type) && !ids.has(type)) {
        ids.add(type);
        orderedUnique.push(type);
      }
    }
  }

  return orderedUnique;
}

const ROOT_TRIGGER_ID_FIELD = 'triggerId';

function escapeKueryQuotedValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** KQL that scopes search to the workflow's custom trigger type ids. */
export function buildWorkflowTriggerScopeKql(triggerIds: readonly string[]): string | undefined {
  if (triggerIds.length === 0) {
    return undefined;
  }
  if (triggerIds.length === 1) {
    return `${ROOT_TRIGGER_ID_FIELD}: "${escapeKueryQuotedValue(triggerIds[0])}"`;
  }
  const orClause = triggerIds.map((id) => `"${escapeKueryQuotedValue(id)}"`).join(' or ');
  return `${ROOT_TRIGGER_ID_FIELD}: (${orClause})`;
}

/** Default SearchBar query: workflow trigger scope visible and editable in the KQL bar. */
export function buildDefaultTriggerEventSearchQuery(workflowTriggerIds: readonly string[]): Query {
  const scopeKql = buildWorkflowTriggerScopeKql(workflowTriggerIds);
  return { query: scopeKql ?? '', language: 'kuery' };
}

function normalizeTriggerEventSearchKql(query: Query): string {
  return typeof query.query === 'string' ? query.query.trim() : '';
}

/** True when the submitted KQL matches the workflow's default trigger scope (not user-filtered). */
export function isDefaultTriggerEventSearchScope(
  submittedQuery: Query,
  workflowTriggerIds: readonly string[]
): boolean {
  return (
    normalizeTriggerEventSearchKql(submittedQuery) ===
    normalizeTriggerEventSearchKql(buildDefaultTriggerEventSearchQuery(workflowTriggerIds))
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
  normalizedInputs: NormalizedWorkflowInputs | undefined,
  definition: WorkflowYaml | null = null,
  canReadWorkflowExecution = false
): WorkflowTriggerTab {
  if (hasWorkflowInputFields(normalizedInputs)) {
    return 'manual';
  }
  if (definition && canReadWorkflowExecution && hasCustomEventTrigger(definition)) {
    return 'event';
  }
  return 'index';
}

export function resolveInitialSelectedTrigger(
  definition: WorkflowYaml | null,
  initialExecutionId: string | undefined,
  hasAlertRacAccess: boolean,
  canReadWorkflowExecution: boolean,
  normalizedInputs: NormalizedWorkflowInputs | undefined
): WorkflowTriggerTab {
  if (initialExecutionId) {
    return canReadWorkflowExecution
      ? 'historical'
      : getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
  }

  const hasAlertTrigger = Boolean(definition?.triggers?.some((t) => t.type === 'alert'));
  const hasEventTrigger = hasCustomEventTrigger(definition);

  if (hasAlertTrigger) {
    return hasAlertRacAccess
      ? 'alert'
      : getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
  }

  if (hasEventTrigger && canReadWorkflowExecution) {
    return 'event';
  }

  if (hasEventTrigger && !canReadWorkflowExecution) {
    return getFallbackTriggerTab(normalizedInputs, definition, false);
  }

  if (hasWorkflowInputFields(normalizedInputs)) {
    return getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
  }

  const preferred = getDefaultTrigger(definition);
  if (preferred === 'alert' && !hasAlertRacAccess) {
    return getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
  }
  return preferred;
}
