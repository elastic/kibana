/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { CreatedByColumnProps } from './created_by_builder';
import type { CreatedByColumnProps } from './created_by_builder';

/**
 * CreatedBy column specification component for ContentListTable.
 * This is a declarative marker component that doesn't render anything.
 * It's used to specify the CreatedBy column configuration as React children.
 *
 * @example
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.CreatedBy width="150px" />
 * </ContentListTable>
 * ```
 */
const CreatedByColumn = (_props: CreatedByColumnProps): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseColumnsFromChildren.
  return null;
};

// Set stable static properties for minification-safe identification.
(
  CreatedByColumn as { __kbnContentListTableRole?: string; __kbnContentListTableId?: string }
).__kbnContentListTableRole = 'column';
(CreatedByColumn as { __kbnContentListTableId?: string }).__kbnContentListTableId = 'createdBy';
CreatedByColumn.displayName = 'CreatedByColumn';

export { CreatedByColumn };
