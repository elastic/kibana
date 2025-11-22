/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Props for View Details action component
 */
export interface ViewDetailsActionProps {
  /**
   * Custom tooltip text
   * @default 'View details'
   */
  tooltip?: string;

  /**
   * Custom aria-label
   * @default 'View details'
   */
  'aria-label'?: string;
}

/**
 * View Details action component for ContentListTable.
 * This is a declarative marker component that doesn't render anything.
 * Handler is automatically read from provider context (itemConfig.actions.onViewDetails).
 *
 * This is a primary action that remains visible in the row actions area.
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListProvider item={{ actions: { onViewDetails: handleViewDetails } }}>
 *   <ContentListTable>
 *     <Column.Actions>
 *       <Action.ViewDetails />
 *       <Action.Edit />
 *     </Column.Actions>
 *   </ContentListTable>
 * </ContentListProvider>
 * ```
 */
const ViewDetailsAction = (_props: ViewDetailsActionProps): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseActionsFromChildren.
  // Handler comes from provider context.
  return null;
};

// Set stable static properties for minification-safe identification.
(
  ViewDetailsAction as { __kbnContentListTableRole?: string; __kbnContentListTableId?: string }
).__kbnContentListTableRole = 'action';
(ViewDetailsAction as { __kbnContentListTableId?: string }).__kbnContentListTableId = 'viewDetails';
ViewDetailsAction.displayName = 'ViewDetailsAction';

export { ViewDetailsAction };
