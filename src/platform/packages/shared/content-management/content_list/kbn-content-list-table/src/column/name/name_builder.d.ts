import React from 'react';
import type { ReactNode } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { type ColumnLayoutProps } from '../layout';
import { type NameCellProps } from './name_cell';
/**
 * Props for the `Column.Name` preset component.
 *
 * These are the declarative attributes consumers pass in JSX. The name builder
 * reads them directly from the parsed attributes.
 */
export interface NameColumnProps extends ColumnLayoutProps {
    /** Custom column title. Defaults to `'Name'`. */
    columnTitle?: string;
    /**
     * Whether the column is sortable.
     *
     * @default true
     */
    sortable?: boolean;
    /**
     * Whether to show the description.
     *
     * @default true
     */
    showDescription?: boolean;
    /**
     * Whether to show tags below the title/description.
     * Requires `item.tags` to contain tag IDs and a tags service
     * to be configured on the `ContentListProvider`.
     *
     * Auto-enabled when the provider has `supports.tags === true`
     * (i.e., a tags service is configured). Set to `false` to
     * explicitly disable tags even when the service is available.
     *
     * @default supports.tags
     */
    showTags?: boolean;
    /**
     * Whether to show a star button inline after the title.
     * Requires `services.favorites` to be configured on the `ContentListProvider`.
     *
     * @default false
     */
    showStarred?: boolean;
    /**
     * Optional click handler for the title.
     * When provided, the provider-level `item.getHref` is ignored unless
     * `shouldUseHref` is explicitly `true`.
     */
    onClick?: (item: ContentListItem) => void;
    /**
     * Whether to use the provider-level `item.getHref` for the title link.
     * Defaults to `true` unless `onClick` is provided.
     */
    shouldUseHref?: boolean;
    /**
     * Optional click handler for tag badges.
     * Called with the tag and a boolean indicating whether a modifier key
     * (Cmd on Mac, Ctrl on Windows/Linux) was held during the click.
     * Only effective when `showTags` is `true`.
     */
    onTagClick?: NameCellProps['onTagClick'];
    /** Custom render function (overrides default rendering). */
    render?: (item: ContentListItem) => ReactNode;
}
/**
 * Build an `EuiBasicTableColumn` from `Column.Name` declarative attributes.
 *
 * @param attributes - The declarative attributes from the parsed `Column.Name` element.
 * @param context - Builder context with provider configuration.
 * @returns An `EuiBasicTableColumn<ContentListItem>` for the name column.
 */
export declare const buildNameColumn: (attributes: NameColumnProps, context: ColumnBuilderContext) => EuiBasicTableColumn<ContentListItem>;
export declare const NameColumn: React.FC<NameColumnProps>;
