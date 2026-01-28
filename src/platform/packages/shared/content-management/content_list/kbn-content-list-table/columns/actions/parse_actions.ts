/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import type { ContentListItem } from '@kbn/content-list-provider';
import { getActionId, isActionComponent } from '../namespaces';

/**
 * Known action IDs that map to built-in handlers.
 */
export const KNOWN_ACTION_IDS = ['viewDetails', 'edit', 'delete', 'duplicate', 'export'] as const;

/**
 * Type for known action IDs.
 */
export type KnownActionId = (typeof KNOWN_ACTION_IDS)[number];

/**
 * Descriptor for a known action (`ViewDetails`, `Edit`, `Delete`, etc.).
 */
export interface KnownActionDescriptor {
  /** The known action identifier. */
  id: KnownActionId;
  /** Optional tooltip text override. */
  tooltip?: string;
  /** Optional aria-label override. */
  'aria-label'?: string;
}

/**
 * Descriptor for a custom action.
 */
export interface CustomActionDescriptor {
  /** Unique identifier for the action. */
  id: string;
  /** Display label for the action. */
  label: string;
  /** EUI icon type. */
  iconType: string;
  /** Optional button color. */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'text';
  /** Optional tooltip text. */
  tooltip?: string;
  /** Handler function called when the action is triggered. */
  handler: (item: ContentListItem) => void | Promise<void>;
  /** Optional predicate to determine if action is enabled for an item. */
  isEnabled?: (item: ContentListItem) => boolean;
  /** Optional aria-label. */
  'aria-label'?: string;
}

/**
 * Union type for action descriptors.
 */
export type ActionDescriptor = KnownActionDescriptor | CustomActionDescriptor;

/**
 * Type guard to check if an {@link ActionDescriptor} is a {@link KnownActionDescriptor}.
 *
 * @param descriptor - The action descriptor to check.
 * @returns `true` if the descriptor is a known action.
 */
export const isKnownAction = (descriptor: ActionDescriptor): descriptor is KnownActionDescriptor =>
  (KNOWN_ACTION_IDS as readonly string[]).includes(descriptor.id);

/**
 * Parse `Action` components from children.
 *
 * Extracts action descriptors from declarative JSX children for use by the actions column builder.
 *
 * @param children - React children that may contain `Action` components.
 * @param hasChildren - Whether children were provided (`false` means use all from provider).
 * @returns Array of action descriptors or `null` (`null` = use all from provider).
 */
export const parseActionsFromChildren = (
  children: ReactNode,
  hasChildren: boolean
): ActionDescriptor[] | null => {
  // If no children provided, return null to indicate "use all from provider".
  if (!hasChildren) {
    return null;
  }

  const descriptors: ActionDescriptor[] = [];
  const seenIds = new Set<string>();

  Children.forEach(children, (child) => {
    if (!isValidElement(child) || !isActionComponent(child)) {
      return;
    }

    const actionId = getActionId(child);
    if (!actionId) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[ContentListTable] Action component missing id');
      }
      return;
    }

    // Check for duplicate IDs.
    if (seenIds.has(actionId)) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[ContentListTable] Duplicate action ID: ${actionId}`);
      }
      return;
    }
    seenIds.add(actionId);

    const props = child.props || {};

    // Check if this is a known action or custom action.
    if ((KNOWN_ACTION_IDS as readonly string[]).includes(actionId)) {
      // Known action - no handler required.
      descriptors.push({
        id: actionId as KnownActionId,
        ...props,
      });
    } else {
      // Custom action - handler required.
      if (!props.handler) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error(`[ContentListTable] Custom action "${actionId}" missing handler`);
        }
        return;
      }

      descriptors.push({
        id: actionId,
        ...props,
      });
    }
  });

  return descriptors;
};
