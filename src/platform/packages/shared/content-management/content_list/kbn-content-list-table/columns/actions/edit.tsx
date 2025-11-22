/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Props for Edit action component
 */
export interface EditActionProps {
  /**
   * Custom tooltip text
   * @default 'Edit'
   */
  tooltip?: string;

  /**
   * Custom aria-label
   * @default 'Edit {item.title}'
   */
  'aria-label'?: string;
}

/**
 * Edit action component for ContentListTable.
 * This is a declarative marker component that doesn't render anything.
 * Handler is automatically read from provider context (itemConfig.actions.onEdit).
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListProvider item={{ actions: { onEdit: handleEdit } }}>
 *   <ContentListTable>
 *     <Column.Actions>
 *       <Action.Edit />
 *     </Column.Actions>
 *   </ContentListTable>
 * </ContentListProvider>
 * ```
 */
const EditAction = (_props: EditActionProps): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseActionsFromChildren.
  // Handler comes from provider context.
  return null;
};

// Set stable static properties for minification-safe identification.
(
  EditAction as { __kbnContentListTableRole?: string; __kbnContentListTableId?: string }
).__kbnContentListTableRole = 'action';
(EditAction as { __kbnContentListTableId?: string }).__kbnContentListTableId = 'edit';
EditAction.displayName = 'EditAction';

export { EditAction };
