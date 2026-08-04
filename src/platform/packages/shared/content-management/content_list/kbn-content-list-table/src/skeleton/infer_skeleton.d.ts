import type { EuiBasicTableColumn } from '@elastic/eui';
import type { SkeletonDescriptor } from '@kbn/content-list-assembly';
import type { ContentListItem } from '@kbn/content-list-provider';
/**
 * Infer a {@link SkeletonDescriptor} from a resolved `EuiBasicTableColumn`
 * for presets (or custom columns) that did not supply their own `skeleton`
 * callback.
 *
 * Uses only the metadata the real resolver already produces — `actions`
 * (present for action columns) and explicit `width`.
 * No preset-specific knowledge is encoded here; preset authors can opt in
 * to higher fidelity by supplying a `skeleton` callback via
 * `column.createPreset({ skeleton })`.
 *
 * Precedence:
 * 1. Column has an `actions` array → narrow rectangle proportional to the
 *    action count. Action columns would otherwise default to the full
 *    text-width skeleton, which reads wrong for an icon-only column.
 * 2. Column carries no `actions` → a text-shape skeleton at the column's
 *    declared `width`, or the default when absent.
 */
export declare const inferColumnSkeleton: (col: EuiBasicTableColumn<ContentListItem>) => SkeletonDescriptor;
