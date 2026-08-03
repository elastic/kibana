import type { FC, ReactNode } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { SkeletonOutput } from '@kbn/content-list-assembly';
import type { ColumnBuilderContext } from './types';
import type { NameColumnProps } from './name/name_builder';
import type { UpdatedAtColumnProps } from './updated_at/updated_at_builder';
import type { ActionsColumnProps } from './actions/actions_builder';
import type { StarredColumnProps } from './starred/starred_builder';
import type { CreatedByColumnProps } from './created_by/created_by_builder';
import { type ColumnLayoutProps } from './layout';
/**
 * Props for the `Column` component (custom columns).
 *
 * Custom columns are identified by `props.id` and provide their own
 * `render` function. Pre-built columns (like `Column.Name`) have
 * dedicated preset components with their own props interfaces.
 */
export interface ColumnProps extends ColumnLayoutProps {
    /** Unique identifier for the column. */
    id: string;
    /** Display name for the column header. */
    name: ReactNode;
    /** Whether the column is sortable. */
    sortable?: boolean;
    /**
     * Optional field name to use for sorting and/or value lookup.
     *
     * Defaults to the column `id` when omitted.
     */
    field?: string;
    /** Optional test subject for the column header/cells. */
    'data-test-subj'?: string;
    /**
     * Optional skeleton descriptor for this custom column during initial load.
     *
     * Use this when the column renders something richer than ordinary text,
     * such as an avatar, badge, icon, or multi-line cell. When omitted, the
     * table infers a text-like skeleton from the resolved column metadata.
     */
    skeleton?: SkeletonOutput | ((context: ColumnBuilderContext) => SkeletonOutput | undefined);
    /** Render function for the column cells. */
    render: (item: ContentListItem) => ReactNode;
}
/**
 * Namespace interface for `Column` sub-components.
 *
 * The base `Column` accepts {@link ColumnProps}; pre-built columns
 * are properties (e.g., `Column.Name`, `Column.Actions`).
 */
export interface ColumnNamespace {
    (props: ColumnProps): ReactNode;
    Name: (props: NameColumnProps) => ReactNode;
    UpdatedAt: (props: UpdatedAtColumnProps) => ReactNode;
    Actions: (props: ActionsColumnProps) => ReactNode;
    /**
     * Pre-built star-toggle column for favoritable items.
     *
     * @param props - {@link StarredColumnProps}
     */
    Starred: (props: StarredColumnProps) => ReactNode;
    /**
     * Pre-built "Created by" avatar column.
     *
     * @param props - {@link CreatedByColumnProps}
     */
    CreatedBy: (props: CreatedByColumnProps) => ReactNode;
}
/** Preset-to-props mapping for table columns. */
export interface ColumnPresets {
    name: NameColumnProps;
    updatedAt: UpdatedAtColumnProps;
    actions: ActionsColumnProps;
    starred: StarredColumnProps;
    createdBy: CreatedByColumnProps;
}
/** Part factory for table columns. */
export declare const column: import("@kbn/content-list-assembly").PartFactory<ColumnPresets, EuiBasicTableColumn<ContentListItem>, import("./types").BuilderContext>;
/**
 * Column component for custom columns.
 *
 * This is a declarative component that doesn't render anything.
 * It's used to specify column configuration as React children.
 * Pre-built columns are available as properties: `Column.Name`, etc.
 *
 * @example
 * ```tsx
 * const { Column } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column
 *     id="status"
 *     name="Status"
 *     width="120px"
 *     render={(item) => {
 *       const status = item.status ?? 'draft';
 *       return <EuiBadge>{status}</EuiBadge>;
 *     }}
 *   />
 * </ContentListTable>
 * ```
 */
export declare const Column: FC<ColumnProps>;
/**
 * Builds a reusable custom-column component from a fixed {@link ColumnProps}
 * config — the column-side analogue of `createFilterControl`. Lets a consuming
 * package expose a ready-to-place column (header, layout, render and skeleton
 * all encapsulated) instead of re-specifying a base `<Column>` at every call
 * site.
 *
 * The returned component takes `Partial<ColumnProps>` overrides that win over
 * the baked-in config (e.g. a narrower `width` at one call site). Returns a
 * fresh component each call, so define it at module scope for a stable
 * identity — mirrors `createFilterControl`.
 *
 * @example
 * ```tsx
 * const TypeColumn = createColumn({
 *   id: 'typeTitle',
 *   name: 'Type',
 *   width: '11em',
 *   truncateText: true,
 *   render: (item) => <TypeCell item={item} />,
 * });
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <TypeColumn />
 *   <Column.UpdatedAt />
 * </ContentListTable>
 * ```
 */
export declare const createColumn: (base: ColumnProps) => FC<Partial<ColumnProps>>;
