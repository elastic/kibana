import React from 'react';
import type { ReactNode } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { type ColumnLayoutProps } from '../layout';
/**
 * Props for the `Column.Actions` preset component.
 *
 * These are the declarative attributes consumers pass in JSX. The actions builder
 * reads them directly from the parsed attributes.
 */
export interface ActionsColumnProps extends Pick<ColumnLayoutProps, 'width' | 'minWidth' | 'maxWidth'> {
    /** Custom column title. Defaults to `'Actions'`. */
    columnTitle?: string;
    /**
     * Whether to stick the actions column to the right side during horizontal scroll.
     *
     * @default true
     */
    sticky?: boolean;
    /**
     * Action children.
     *
     * When provided, only the specified actions are rendered in the given order.
     * When omitted, actions are determined automatically from the provider config
     * (e.g., edit is shown if `actions.edit.onItemAction` is configured, delete
     * is shown if `actions.delete.onBulkAction` is configured, content editor is
     * shown if `features.contentEditor.open` is configured).
     */
    children?: ReactNode;
}
/**
 * Build an `EuiBasicTableColumn` (actions column) from `Column.Actions` declarative attributes.
 *
 * Parses action children to determine which row actions to render. When no children
 * are provided, defaults are inferred from the provider configuration.
 *
 * @param attributes - The declarative attributes from the parsed `Column.Actions` element.
 * @param context - Builder context with provider configuration.
 * @returns An `EuiBasicTableColumn<ContentListItem>` for the actions column, or `undefined` to skip.
 */
export declare const buildActionsColumn: (attributes: ActionsColumnProps, context: ColumnBuilderContext) => EuiBasicTableColumn<ContentListItem> | undefined;
export declare const ActionsColumn: React.FC<ActionsColumnProps>;
