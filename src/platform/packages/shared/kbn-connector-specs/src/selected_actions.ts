/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionScope } from './connector_spec';
import { TEST_CONNECTOR_SUB_ACTION } from './connector_spec';

/**
 * Connector-instance action allowlist.
 * - `undefined` / `null` = no selection; all actions enabled
 * - `string[]` = specific allowlist (empty array = none enabled)
 */
export type SelectedActions = string[] | null | undefined;

export const isSpecificActionsSelection = (
  selectedActions: SelectedActions
): selectedActions is string[] => Array.isArray(selectedActions);

/**
 * Whether a sub-action is enabled for a connector instance.
 *
 * - Specific mode (`string[]`): name must be in the allowlist
 * - Unset (`null` / `undefined`): all actions enabled
 * - Reserved `_test` is always enabled
 */
export const isSelectedActionEnabled = (
  actionName: string,
  selectedActions: SelectedActions
): boolean => {
  if (actionName === TEST_CONNECTOR_SUB_ACTION) {
    return true;
  }
  if (isSpecificActionsSelection(selectedActions)) {
    return selectedActions.includes(actionName);
  }
  return true;
};

/**
 * Filters a connector's actions by instance selection.
 * Unset (`null`/`undefined`) returns all actions; specific mode (`string[]`) returns the allowlist.
 */
export const filterActionsBySelection = <
  T extends { isTool?: boolean; description?: string; scope?: ActionScope }
>(
  actions: Record<string, T>,
  selectedActions: SelectedActions,
  options?: { requireDescription?: boolean }
): Array<[string, T]> => {
  const entries = Object.entries(actions).filter(([, action]) => action.isTool === true);
  const filtered = isSpecificActionsSelection(selectedActions)
    ? entries.filter(([name]) => selectedActions.includes(name))
    : entries;

  if (options?.requireDescription) {
    return filtered.filter(([, action]) => Boolean(action.description));
  }
  return filtered;
};

/**
 * Resolves the effective scope of an action.
 * - `scope` field wins when present.
 * - `isTool: false` without a scope maps to `destroy` (legacy HITL, most restrictive).
 * - Everything else defaults to `read`.
 */
export const resolveActionScope = (action: {
  scope?: ActionScope;
  isTool?: boolean;
}): ActionScope => {
  if (action.scope) return action.scope;
  return action.isTool === false ? 'destroy' : 'read';
};

const SCOPE_ORDER: Record<ActionScope, number> = { read: 0, write: 1, destroy: 2 };

/**
 * Returns the maximum scope implied by the selected actions, or `null` when nothing is selected.
 */
export const getEffectiveScope = (
  actions: ReadonlyArray<{ name: string; scope?: ActionScope; isTool?: boolean }>,
  selected: string[]
): ActionScope | null => {
  if (selected.length === 0) return null;
  const selectedSet = new Set(selected);
  let max: ActionScope = 'read';
  for (const action of actions) {
    if (!selectedSet.has(action.name)) continue;
    const s = resolveActionScope(action);
    if (SCOPE_ORDER[s] > SCOPE_ORDER[max]) {
      max = s;
      if (max === 'destroy') break;
    }
  }
  return max;
};

const SCOPE_ANNOTATIONS: Partial<Record<ActionScope, string>> = {
  write: ' [WRITE]',
  destroy: ' [DESTROY]',
};

/**
 * Formats `name[SCOPE]: description` for agent-facing action listings.
 */
export const formatConnectorActionLine = (
  actionName: string,
  action: { description?: string; isTool?: boolean; scope?: ActionScope }
): string => {
  const description = action.description ?? actionName;
  const scope = resolveActionScope(action);
  const annotation = SCOPE_ANNOTATIONS[scope] ?? '';
  return `${actionName}${annotation}: ${description}`;
};
