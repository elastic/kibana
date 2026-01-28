/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListItem } from '@kbn/content-list-provider';

/**
 * Props for custom Action component
 */
export interface CustomActionProps {
  /**
   * Unique identifier for the action
   */
  id: string;

  /**
   * Display label for the action
   */
  label: string;

  /**
   * EUI icon type
   */
  iconType: string;

  /**
   * Button color
   */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'text';

  /**
   * Tooltip text
   */
  tooltip?: string;

  /**
   * Handler function for the action
   */
  handler: (item: ContentListItem) => void | Promise<void>;

  /**
   * Optional predicate to determine if action is enabled for an item.
   * When returns `false`, the action is rendered as disabled (grayed out, not clickable).
   */
  isEnabled?: (item: ContentListItem) => boolean;

  /**
   * Custom aria-label
   */
  'aria-label'?: string;
}

/**
 * Custom Action component for ContentListTable.
 * This is a declarative marker component that doesn't render anything.
 * Unlike pre-built actions (Action.Edit, Action.Delete, etc.), custom actions require an explicit handler.
 *
 * The base `Action` component is used for custom actions; pre-built actions are properties.
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Actions>
 *     <Action.Edit />
 *     <Action
 *       id="share"
 *       label="Share"
 *       iconType="share"
 *       handler={(item) => handleShare(item)}
 *       tooltip="Share with team"
 *     />
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
const CustomAction = (_props: CustomActionProps): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseActionsFromChildren.
  return null;
};

// Set stable static properties for minification-safe identification.
(CustomAction as { __kbnContentListTableRole?: string }).__kbnContentListTableRole = 'action';
CustomAction.displayName = 'CustomAction';

export { CustomAction };
