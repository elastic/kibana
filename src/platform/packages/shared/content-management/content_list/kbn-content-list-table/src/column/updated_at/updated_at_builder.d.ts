import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { type ColumnLayoutProps } from '../layout';
/**
 * Props for the `Column.UpdatedAt` preset component.
 *
 * These are the declarative attributes consumers pass in JSX. The builder
 * reads them directly from the parsed attributes.
 */
export interface UpdatedAtColumnProps extends ColumnLayoutProps {
    /** Custom column title. Defaults to `'Last updated'`. */
    columnTitle?: string;
    /**
     * Whether the column is sortable.
     *
     * @default true
     */
    sortable?: boolean;
}
/**
 * Build an `EuiBasicTableColumn` from `Column.UpdatedAt` declarative attributes.
 *
 * @param attributes - The declarative attributes from the parsed `Column.UpdatedAt` element.
 * @param context - Builder context with provider configuration.
 * @returns An `EuiBasicTableColumn<ContentListItem>` for the updated at column.
 */
export declare const buildUpdatedAtColumn: (attributes: UpdatedAtColumnProps, context: ColumnBuilderContext) => EuiBasicTableColumn<ContentListItem>;
/**
 * UpdatedAt column specification component for `ContentListTable`.
 *
 * This is a declarative component that doesn't render anything.
 * It's used to specify the UpdatedAt column configuration as React children.
 *
 * @example Basic usage
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column.UpdatedAt />
 * </ContentListTable>
 * ```
 *
 * @example With custom configuration
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column.UpdatedAt
 *     columnTitle="Modified"
 *     width="150px"
 *   />
 * </ContentListTable>
 * ```
 */
export declare const UpdatedAtColumn: React.FC<UpdatedAtColumnProps>;
