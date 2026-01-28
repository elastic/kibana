/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Children, isValidElement } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { KNOWN_ACTION_IDS, type KnownActionId } from './types';
import { parseDeleteActionProps } from './delete';
import { parseExportActionProps } from './export';
import { parseProps as parseSelectionActionProps } from './selection_action_builder';
import type { ActionDescriptor, ActionConfig } from './build_actions';

// Re-export types for convenience.
export type { ActionDescriptor, ActionConfig };
export { KNOWN_ACTION_IDS, type KnownActionId };

/**
 * Gets the action ID from a React element using static properties.
 *
 * @param element - The React element to check.
 * @returns The action ID or `undefined` if not found.
 */
const getActionId = (element: ReactElement): string | undefined => {
  const type = element.type as {
    __kbnSelectionActionId?: string;
    displayName?: string;
  };
  // For known actions, use the static ID.
  if (type.__kbnSelectionActionId) {
    return type.__kbnSelectionActionId;
  }
  // For custom actions (SelectionAction), get from props.
  if (type.displayName === 'SelectionAction') {
    const id = (element.props as { id?: string }).id;
    if (!id) {
      // eslint-disable-next-line no-console
      console.warn('[ContentListToolbar] SelectionAction missing required "id" prop');
    }
    return id;
  }
  return undefined;
};

/**
 * Checks if a React element is a selection action component.
 *
 * @param element - The React element to check.
 * @returns `true` if the element is a selection action component.
 */
const isActionComponent = (element: ReactElement): boolean => {
  const type = element.type as { __kbnSelectionActionRole?: string };
  return type.__kbnSelectionActionRole === 'action';
};

/**
 * Type guard to check if an action ID is a known action ID.
 *
 * @param id - The action ID to check.
 * @returns `true` if the ID is a known action ID.
 */
export const isKnownActionId = (id: string): id is KnownActionId =>
  (KNOWN_ACTION_IDS as readonly string[]).includes(id);

/**
 * Parses a known action element into an ActionDescriptor.
 *
 * @param id - The known action ID.
 * @param element - The React element.
 * @returns The ActionDescriptor or null if invalid.
 */
const parseKnownAction = (id: KnownActionId, element: ReactElement): ActionDescriptor | null => {
  let config: ActionConfig;

  switch (id) {
    case 'delete':
      config = parseDeleteActionProps(element);
      break;
    case 'export':
      config = parseExportActionProps(element);
      break;
    default:
      return null;
  }

  return { id, config };
};

/**
 * Parses a custom action element into an ActionDescriptor.
 *
 * @param element - The React element.
 * @returns The ActionDescriptor or null if invalid.
 */
const parseCustomAction = (element: ReactElement): ActionDescriptor | null => {
  const config = parseSelectionActionProps(element);
  if (!config) {
    return null;
  }
  return { id: config.id, config };
};

/**
 * Parses {@link SelectionActions} marker components from children.
 *
 * Extracts action configurations from declarative action marker children.
 * The order of actions is preserved from the children order.
 *
 * @param children - React children that may contain action components.
 * @returns An array of {@link ActionDescriptor} objects.
 *
 * @example
 * ```tsx
 * const actions = parseSelectionActionsFromChildren(
 *   <>
 *     <SelectionAction.Delete />
 *     <SelectionAction.Export />
 *     <SelectionAction id="archive" label="Archive" onSelect={handleArchive} />
 *   </>
 * );
 * ```
 */
export const parseSelectionActionsFromChildren = (children: ReactNode): ActionDescriptor[] => {
  const actions: ActionDescriptor[] = [];
  const seenIds = new Set<string>();

  Children.forEach(children, (child) => {
    if (!isValidElement(child) || !isActionComponent(child)) {
      return;
    }

    const actionId = getActionId(child);
    if (!actionId) {
      // Warning already logged in getActionId or parseSelectionActionProps.
      return;
    }

    // Check for duplicate IDs.
    if (seenIds.has(actionId)) {
      // eslint-disable-next-line no-console
      console.warn(
        isKnownActionId(actionId)
          ? `[ContentListToolbar] Duplicate ${
              actionId.charAt(0).toUpperCase() + actionId.slice(1)
            } action`
          : `[ContentListToolbar] Duplicate action ID: ${actionId}`
      );
      return;
    }
    seenIds.add(actionId);

    // Parse based on action type.
    let descriptor: ActionDescriptor | null;
    if (isKnownActionId(actionId)) {
      descriptor = parseKnownAction(actionId, child);
    } else {
      descriptor = parseCustomAction(child);
    }

    if (descriptor) {
      actions.push(descriptor);
    }
  });

  return actions;
};
