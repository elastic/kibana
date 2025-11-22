/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Props for Delete action component
 */
export interface DeleteActionProps {
  /**
   * Custom tooltip text
   * @default 'Delete'
   */
  tooltip?: string;

  /**
   * Custom aria-label
   * @default 'Delete {item.title}'
   */
  'aria-label'?: string;
}

/**
 * Delete action component for ContentListTable.
 * This is a declarative marker component that doesn't render anything.
 * Handler is automatically read from provider context (itemConfig.actions.onDelete).
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListProvider item={{ actions: { onDelete: handleDelete } }}>
 *   <ContentListTable>
 *     <Column.Actions>
 *       <Action.Delete />
 *     </Column.Actions>
 *   </ContentListTable>
 * </ContentListProvider>
 * ```
 */
const DeleteAction = (_props: DeleteActionProps): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseActionsFromChildren.
  // Handler comes from provider context.
  return null;
};

// Set stable static properties for minification-safe identification.
(
  DeleteAction as { __kbnContentListTableRole?: string; __kbnContentListTableId?: string }
).__kbnContentListTableRole = 'action';
(DeleteAction as { __kbnContentListTableId?: string }).__kbnContentListTableId = 'delete';
DeleteAction.displayName = 'DeleteAction';

export { DeleteAction };
