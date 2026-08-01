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
 * - `null` / `undefined` = recommended mode (isTool actions only)
 * - `string[]` = specific allowlist (empty array = none enabled)
 */
export type SelectedActions = string[] | null | undefined;

export const HITL_ACTION_CONFIRMATION_SUFFIX =
  ' (requires user confirmation before calling)';

export const isSpecificActionsSelection = (
  selectedActions: SelectedActions
): selectedActions is string[] => Array.isArray(selectedActions);

/**
 * Whether a sub-action is enabled for a connector instance.
 *
 * - Specific mode (`string[]`): name must be in the allowlist
 * - Recommended mode (absent/null): only `isTool` actions
 * - Reserved `_test` is always enabled
 *
 * When `actions` is omitted in recommended mode, returns `true` (unknown type /
 * no spec available — callers that need a hard deny should pass an actions map).
 */
export const isSelectedActionEnabled = (
  actionName: string,
  selectedActions: SelectedActions,
  actions?: Record<string, { isTool?: boolean }>
): boolean => {
  if (actionName === TEST_CONNECTOR_SUB_ACTION) {
    return true;
  }
  if (isSpecificActionsSelection(selectedActions)) {
    return selectedActions.includes(actionName);
  }
  if (!actions) {
    return true;
  }
  return actions[actionName]?.isTool ?? false;
};

/**
 * Filters a connector's actions by instance selection.
 * Recommended mode returns isTool actions; specific mode returns the allowlist.
 */
export const filterActionsBySelection = <
  T extends { isTool?: boolean; description?: string }
>(
  actions: Record<string, T>,
  selectedActions: SelectedActions,
  options?: { requireDescription?: boolean }
): Array<[string, T]> => {
  const entries = Object.entries(actions);
  const filtered = isSpecificActionsSelection(selectedActions)
    ? entries.filter(([name]) => selectedActions.includes(name))
    : entries.filter(([, action]) => Boolean(action.isTool));

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
