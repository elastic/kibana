import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { type ColumnLayoutProps } from '../layout';
/**
 * Props for the `Column.Starred` preset component.
 */
export interface StarredColumnProps extends Pick<ColumnLayoutProps, 'width' | 'minWidth' | 'maxWidth'> {
    /** Column width (CSS value). Defaults to `'40px'`. */
    width?: string;
}
/**
 * Build an `EuiBasicTableColumn` from `Column.Starred` declarative attributes.
 *
 * Returns `undefined` when `supports.starred` is false so the column is
 * omitted entirely from the table (no empty column or wasted space).
 * Returns a narrow, non-sortable column containing a star icon button otherwise.
 */
export declare const buildStarredColumn: (attributes: StarredColumnProps, context: ColumnBuilderContext) => EuiBasicTableColumn<ContentListItem> | undefined;
export declare const StarredColumn: React.FC<StarredColumnProps>;
