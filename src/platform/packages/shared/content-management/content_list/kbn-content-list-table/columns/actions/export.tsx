/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Props for Export action component
 */
export interface ExportActionProps {
  /**
   * Custom tooltip text
   * @default 'Export'
   */
  tooltip?: string;

  /**
   * Custom aria-label
   * @default 'Export {item.title}'
   */
  'aria-label'?: string;
}

/**
 * Export action component for ContentListTable.
 * This is a declarative marker component that doesn't render anything.
 * Handler is automatically read from provider context (itemConfig.actions.onExport).
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListProvider item={{ actions: { onExport: handleExport } }}>
 *   <ContentListTable>
 *     <Column.Actions>
 *       <Action.Export />
 *     </Column.Actions>
 *   </ContentListTable>
 * </ContentListProvider>
 * ```
 */
const ExportAction = (_props: ExportActionProps): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseActionsFromChildren.
  // Handler comes from provider context.
  return null;
};

// Set stable static properties for minification-safe identification.
(
  ExportAction as { __kbnContentListTableRole?: string; __kbnContentListTableId?: string }
).__kbnContentListTableRole = 'action';
(ExportAction as { __kbnContentListTableId?: string }).__kbnContentListTableId = 'export';
ExportAction.displayName = 'ExportAction';

export { ExportAction };
