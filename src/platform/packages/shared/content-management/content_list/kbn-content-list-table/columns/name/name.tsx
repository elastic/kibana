/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { NameColumnProps } from './name_builder';
import type { NameColumnProps } from './name_builder';

/**
 * Name column specification component for ContentListTable.
 * This is a declarative marker component that doesn't render anything.
 * It's used to specify the Name column configuration as React children.
 *
 * By default, tags and starred are shown based on the provider's configuration:
 * - Tags are shown if `tags={true}` on the provider.
 * - Starred is shown if `favorites={true}` on the provider.
 *
 * You can explicitly override these defaults with `showTags` and `showStarred` props.
 *
 * @example Basic usage
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 * </ContentListTable>
 * ```
 *
 * @example With custom configuration
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name
 *     showDescription={false}
 *     showTags={false}
 *     showStarred={false}
 *     width="50%"
 *   />
 * </ContentListTable>
 * ```
 */
const NameColumn = (_props: NameColumnProps): null => {
  // This is a declarative marker component that doesn't render anything.
  // The props are extracted by parseColumnsFromChildren.
  return null;
};

// Set stable static properties for minification-safe identification.
(
  NameColumn as { __kbnContentListTableRole?: string; __kbnContentListTableId?: string }
).__kbnContentListTableRole = 'column';
(NameColumn as { __kbnContentListTableId?: string }).__kbnContentListTableId = 'name';
NameColumn.displayName = 'NameColumn';

export { NameColumn };
