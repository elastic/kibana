/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { ActionsColumnProps } from './actions_builder';
import type { ActionsColumnProps } from './actions_builder';

/**
 * Action column specification component for ContentListTable.
 * This is a declarative marker component that doesn't render anything.
 * It's used to specify the Action column configuration as React children.
 *
 * With no children, shows all actions from provider:
 * @example
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Actions />
 * </ContentListTable>
 * ```
 *
 * With specific actions as children:
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Actions width="150px">
 *     <Action.Edit />
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
const ActionsColumn = (_props: ActionsColumnProps): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseColumnsFromChildren.
  return null;
};

// Set stable static properties for minification-safe identification.
(
  ActionsColumn as { __kbnContentListTableRole?: string; __kbnContentListTableId?: string }
).__kbnContentListTableRole = 'column';
(ActionsColumn as { __kbnContentListTableId?: string }).__kbnContentListTableId = 'actions';
ActionsColumn.displayName = 'ActionsColumn';

export { ActionsColumn };
