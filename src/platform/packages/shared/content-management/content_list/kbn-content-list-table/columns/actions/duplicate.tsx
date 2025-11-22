/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Props for Duplicate action component
 */
export interface DuplicateActionProps {
  /**
   * Custom tooltip text
   * @default 'Duplicate'
   */
  tooltip?: string;

  /**
   * Custom aria-label
   * @default 'Duplicate {item.title}'
   */
  'aria-label'?: string;
}

/**
 * Duplicate action component for ContentListTable.
 * This is a declarative marker component that doesn't render anything.
 * Handler is automatically read from provider context (itemConfig.actions.onDuplicate).
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListProvider item={{ actions: { onDuplicate: handleDuplicate } }}>
 *   <ContentListTable>
 *     <Column.Actions>
 *       <Action.Duplicate />
 *     </Column.Actions>
 *   </ContentListTable>
 * </ContentListProvider>
 * ```
 */
const DuplicateAction = (_props: DuplicateActionProps): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseActionsFromChildren.
  // Handler comes from provider context.
  return null;
};

// Set stable static properties for minification-safe identification.
(
  DuplicateAction as { __kbnContentListTableRole?: string; __kbnContentListTableId?: string }
).__kbnContentListTableRole = 'action';
(DuplicateAction as { __kbnContentListTableId?: string }).__kbnContentListTableId = 'duplicate';
DuplicateAction.displayName = 'DuplicateAction';

export { DuplicateAction };
