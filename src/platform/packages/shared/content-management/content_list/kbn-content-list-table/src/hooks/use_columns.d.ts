import type { ReactNode } from 'react';
import { type EuiBasicTableColumn } from '@elastic/eui';
import { type ContentListItem } from '@kbn/content-list-provider';
import type { SkeletonOutput } from '@kbn/content-list-assembly';
/**
 * A resolved column plus the skeleton shape the table skeleton should draw
 * in its place during `'initialLoad'`.
 *
 * `skeleton` is either the preset's own {@link SkeletonOutput} (when
 * registered via `column.createPreset({ skeleton })`) or an inferred
 * descriptor derived from the real column's metadata.
 */
export interface ResolvedColumn {
    /** The real column handed to `EuiBasicTable`. */
    column: EuiBasicTableColumn<ContentListItem>;
    /** Skeleton shape descriptor — preset-provided or inferred. */
    skeleton: SkeletonOutput;
}
/**
 * Hook to parse and build table columns from declarative children.
 *
 * Encapsulates the full column resolution flow:
 * 1. Parse declarative `Column` components from children via `column.parseChildren`.
 * 2. Resolve `EuiBasicTableColumn` definitions via `column.resolve`.
 * 3. Resolve per-preset skeleton descriptors via `column.resolveSkeleton`,
 *    falling back to inference from the resolved column metadata.
 * 4. Fall back to the default columns if none are found.
 *
 * @param children - React children containing `Column` declarative components.
 * @param onDelete - Optional callback invoked by the default Delete action to open the modal.
 * @returns Array of {@link ResolvedColumn} entries — each pairing an
 *   `EuiBasicTableColumn` (for the real table) with a `SkeletonOutput`
 *   (for the loading skeleton).
 */
export declare const useColumns: (children: ReactNode, onDelete?: (items: ContentListItem[]) => void) => ResolvedColumn[];
