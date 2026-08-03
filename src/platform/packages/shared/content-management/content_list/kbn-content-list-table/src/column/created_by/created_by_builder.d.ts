import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { type ColumnLayoutProps } from '../layout';
/**
 * Props for the `Column.CreatedBy` preset component.
 */
export interface CreatedByColumnProps extends ColumnLayoutProps {
    /** Override column header text. Defaults to "Created by". */
    columnTitle?: string;
}
/**
 * Build an `EuiBasicTableColumn` from `Column.CreatedBy` declarative attributes.
 *
 * Returns `undefined` when `supports.userProfiles` is false so the column is
 * omitted entirely from the table (no empty column or wasted space).
 */
export declare const buildCreatedByColumn: (attributes: CreatedByColumnProps, context: ColumnBuilderContext) => EuiBasicTableColumn<ContentListItem> | undefined;
export declare const CreatedByColumn: React.FC<CreatedByColumnProps>;
