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
import {
  applyInputDefaults,
  getInputsFromDefinition,
} from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { ENABLED_TRIGGER_TABS } from './constants';
import type { WorkflowTriggerTab } from './types';

export type NormalizedWorkflowInputs = JsonModelSchemaType | undefined;

/** True when normalized workflow inputs define at least one field. */
export function hasWorkflowInputFields(normalized?: NormalizedWorkflowInputs): boolean {
  const props = normalized?.properties;
  return Boolean(props && Object.keys(props).length > 0);
}

const OMITTED_DEFAULT = Symbol('omittedDefault');

const omitUnchangedDefault = (
  value: unknown,
  defaultValue: unknown
): unknown | typeof OMITTED_DEFAULT => {
  if (Object.is(value, defaultValue)) {
    return OMITTED_DEFAULT;
  }

  if (Array.isArray(value) && Array.isArray(defaultValue)) {
    const isUnchanged =
      value.length === defaultValue.length &&
      value.every(
        (nestedValue, index) =>
          omitUnchangedDefault(nestedValue, defaultValue[index]) === OMITTED_DEFAULT
      );
    return isUnchanged ? OMITTED_DEFAULT : value;
  }

  if (
    value === null ||
    defaultValue === null ||
    typeof value !== 'object' ||
    typeof defaultValue !== 'object' ||
    Array.isArray(value) ||
    Array.isArray(defaultValue)
  ) {
    return value;
  }

  const defaultRecord = defaultValue as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (Object.hasOwn(defaultRecord, key)) {
      const nestedResult = omitUnchangedDefault(nestedValue, defaultRecord[key]);
      if (nestedResult !== OMITTED_DEFAULT) {
        result[key] = nestedResult;
      }
    } else {
      result[key] = nestedValue;
    }
  }

  return Object.keys(result).length === 0 ? OMITTED_DEFAULT : result;
};

/**
 * Removes values copied unchanged from schema defaults by the manual-run form.
 * The execution engine can then apply and render those values as defaults while
 * retaining user-edited values as caller-provided runtime data.
 */
export function omitUnchangedWorkflowInputDefaults(
  inputs: Record<string, unknown>,
  inputsSchema: NormalizedWorkflowInputs
): Record<string, unknown> {
  const defaults = applyInputDefaults(undefined, inputsSchema) ?? {};
  const result = omitUnchangedDefault(inputs, defaults);
  return result === OMITTED_DEFAULT ? {} : (result as Record<string, unknown>);
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

export function workflowDefinitionHasTriggerType(
  definition: WorkflowYaml | null,
  triggerType: string
): boolean {
  return Boolean(definition?.triggers?.some((trigger) => trigger.type === triggerType));
}

/** Run-modal tabs to show based on triggers declared in the workflow definition. */
export function getVisibleWorkflowTriggerTabs(
  definition: WorkflowYaml | null,
  { includeHistorical = true }: { includeHistorical?: boolean } = {}
): readonly WorkflowTriggerTab[] {
  if (!definition?.triggers?.length) {
    return includeHistorical
      ? ENABLED_TRIGGER_TABS
      : ENABLED_TRIGGER_TABS.filter((tab) => tab !== 'historical');
  }

  const visible: WorkflowTriggerTab[] = [];

  if (workflowDefinitionHasTriggerType(definition, 'alert')) {
    visible.push('alert');
  }
  if (hasCustomEventTrigger(definition)) {
    visible.push('event');
  }
  if (workflowDefinitionHasTriggerType(definition, 'manual')) {
    visible.push('index');
  }
  visible.push('manual');
  if (includeHistorical) {
    visible.push('historical');
  }

  return visible;
}

export interface WorkflowTriggerTabAvailability {
  hasAlertRacAccess: boolean;
  canReadWorkflowExecution: boolean;
  eventDrivenExecutionEnabled: boolean;
}

export function isWorkflowTriggerTabDisabled(
  trigger: WorkflowTriggerTab,
  availability: WorkflowTriggerTabAvailability
): boolean {
  if (trigger === 'alert' && !availability.hasAlertRacAccess) {
    return true;
  }
  if (trigger === 'historical' && !availability.canReadWorkflowExecution) {
    return true;
  }
  if (
    trigger === 'event' &&
    (!availability.canReadWorkflowExecution || !availability.eventDrivenExecutionEnabled)
  ) {
    return true;
  }
  return false;
}

export function ensureSelectedTriggerTabVisible(
  selected: WorkflowTriggerTab,
  visibleTabs: readonly WorkflowTriggerTab[],
  availability?: WorkflowTriggerTabAvailability
): WorkflowTriggerTab {
  const isEnabled = (tab: WorkflowTriggerTab) =>
    !availability || !isWorkflowTriggerTabDisabled(tab, availability);

  if (visibleTabs.includes(selected) && isEnabled(selected)) {
    return selected;
  }

  const firstEnabledVisible = visibleTabs.find(isEnabled);
  return firstEnabledVisible ?? visibleTabs[0] ?? 'manual';
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
  normalizedInputs: NormalizedWorkflowInputs | undefined,
  eventDrivenExecutionEnabled = true,
  { includeHistorical = true }: { includeHistorical?: boolean } = {}
): WorkflowTriggerTab {
  const visibleTabs = getVisibleWorkflowTriggerTabs(definition, { includeHistorical });

  let selected: WorkflowTriggerTab;

  if (initialExecutionId) {
    selected = canReadWorkflowExecution
      ? 'historical'
      : getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
  } else {
    const hasAlertTrigger = workflowDefinitionHasTriggerType(definition, 'alert');
    const hasEventTrigger = hasCustomEventTrigger(definition);

    if (hasAlertTrigger) {
      selected = hasAlertRacAccess
        ? 'alert'
        : getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
    } else if (hasEventTrigger && canReadWorkflowExecution) {
      selected = 'event';
    } else if (hasEventTrigger && !canReadWorkflowExecution) {
      selected = getFallbackTriggerTab(normalizedInputs, definition, false);
    } else if (hasWorkflowInputFields(normalizedInputs)) {
      selected = getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution);
    } else {
      const preferred = getDefaultTrigger(definition);
      selected =
        preferred === 'alert' && !hasAlertRacAccess
          ? getFallbackTriggerTab(normalizedInputs, definition, canReadWorkflowExecution)
          : preferred;
    }
  }

  return ensureSelectedTriggerTabVisible(selected, visibleTabs, {
    hasAlertRacAccess,
    canReadWorkflowExecution,
    eventDrivenExecutionEnabled,
  });
}
