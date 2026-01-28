/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { UpdatedAtColumnProps } from './updated_at_builder';
import type { UpdatedAtColumnProps } from './updated_at_builder';

/**
 * UpdatedAt column specification component for ContentListTable.
 * This is a declarative marker component that doesn't render anything.
 * It's used to specify the UpdatedAt column configuration as React children.
 *
 * @example
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.UpdatedAt width="200px" columnTitle="Last Modified" />
 * </ContentListTable>
 * ```
 */
const UpdatedAtColumn = (_props: UpdatedAtColumnProps): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseColumnsFromChildren.
  return null;
};

// Set stable static properties for minification-safe identification.
(
  UpdatedAtColumn as { __kbnContentListTableRole?: string; __kbnContentListTableId?: string }
).__kbnContentListTableRole = 'column';
(UpdatedAtColumn as { __kbnContentListTableId?: string }).__kbnContentListTableId = 'updatedAt';
UpdatedAtColumn.displayName = 'UpdatedAtColumn';

export { UpdatedAtColumn };
