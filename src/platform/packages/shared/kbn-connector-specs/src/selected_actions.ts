/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TEST_CONNECTOR_SUB_ACTION } from './connector_spec';

/**
 * Connector-instance action allowlist.
 * - `undefined` / `null` = no selection; all actions enabled
 * - `string[]` = specific allowlist (empty array = none enabled)
 */
export type SelectedActions = string[] | null | undefined;

export const HITL_ACTION_CONFIRMATION_SUFFIX = ' (requires user confirmation before calling)';

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
export const filterActionsBySelection = <T extends { isTool?: boolean; description?: string }>(
  actions: Record<string, T>,
  selectedActions: SelectedActions,
  options?: { requireDescription?: boolean }
): Array<[string, T]> => {
  const entries = Object.entries(actions);
  const filtered = isSpecificActionsSelection(selectedActions)
    ? entries.filter(([name]) => selectedActions.includes(name))
    : entries;

  if (options?.requireDescription) {
    return filtered.filter(([, action]) => Boolean(action.description));
  }
  return filtered;
};

/**
 * Formats `name: description` for agent-facing listings, with a HITL note when needed.
 */
export const formatConnectorActionLine = (
  actionName: string,
  action: { description?: string; isTool?: boolean }
): string => {
  const description = action.description ?? actionName;
  const hitlSuffix = action.isTool ? '' : HITL_ACTION_CONFIRMATION_SUFFIX;
  return `${actionName}: ${description}${hitlSuffix}`;
};
