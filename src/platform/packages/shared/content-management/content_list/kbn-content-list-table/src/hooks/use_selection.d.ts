import type { EuiTableSelectionType } from '@elastic/eui';
import { type ContentListItem } from '@kbn/content-list-provider';
/**
 * Return type for the {@link useSelection} hook.
 */
export interface UseSelectionReturn {
    /**
     * Selection configuration for `EuiBasicTable`'s `selection` prop.
     * Returns `undefined` when selection is not supported (e.g., read-only mode).
     */
    selection?: EuiTableSelectionType<ContentListItem>;
}
/**
 * Hook to integrate content list selection with `EuiBasicTable`.
 *
 * Bridges the provider's selection state with `EuiBasicTable`'s `selection` prop
 * using controlled mode (`selected`).
 *
 * Composes two layers of "is this row selectable?":
 * 1. The configured delete action restriction, when delete is bulk-enabled.
 * 2. The consumer's optional `SelectionConfig.selectable` predicate.
 *
 * The tooltip (`selectableMessage`) surfaces the consumer's message if they
 * disabled the row, or the delete restriction reason otherwise.
 *
 * @returns Object containing the `selection` prop for `EuiBasicTable`.
 */
export declare const useSelection: () => UseSelectionReturn;
