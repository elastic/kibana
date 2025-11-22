/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { ExpanderColumnProps } from './expander_builder';
import type { ExpanderColumnProps } from './expander_builder';

/**
 * Expander column specification component for ContentListTable.
 * This is a declarative marker component that doesn't render anything.
 * It's used to specify the Expander column configuration as React children.
 *
 * The expander column shows expand/collapse buttons for rows that have
 * expandable content (determined by the `renderDetails` prop on ContentListTable).
 *
 * @example Basic usage
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable renderDetails={(item) => <Details item={item} />}>
 *   <Column.Expander />
 *   <Column.Name />
 * </ContentListTable>
 * ```
 *
 * @example With custom icons
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable renderDetails={(item) => <Details item={item} />}>
 *   <Column.Expander
 *     iconType={{
 *       expanded: 'arrowUp',
 *       collapsed: 'arrowDown',
 *     }}
 *   />
 *   <Column.Name />
 * </ContentListTable>
 * ```
 */
const ExpanderColumn = (_props: ExpanderColumnProps): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseColumnsFromChildren.
  return null;
};

// Set stable static properties for minification-safe identification.
(
  ExpanderColumn as { __kbnContentListTableRole?: string; __kbnContentListTableId?: string }
).__kbnContentListTableRole = 'column';
(ExpanderColumn as { __kbnContentListTableId?: string }).__kbnContentListTableId = 'expander';
ExpanderColumn.displayName = 'ExpanderColumn';

export { ExpanderColumn };
