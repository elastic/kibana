import type { ContentListItem } from '../../item';
/**
 * Return type for the {@link useContentListSelection} hook.
 */
export interface UseContentListSelectionReturn {
    /** IDs of currently selected items. */
    selectedIds: string[];
    /** Currently selected items resolved from the loaded items list. */
    selectedItems: ContentListItem[];
    /** Number of currently selected items. */
    selectedCount: number;
    /** Whether a specific item is selected. */
    isSelected: (id: string) => boolean;
    /**
     * Replace the selection with the given items.
     * Typically called by `EuiBasicTable`'s `onSelectionChange` callback.
     */
    setSelection: (items: ContentListItem[]) => void;
    /** Clear all selected items. */
    clearSelection: () => void;
    /** Whether selection is supported (enabled via features, not read-only). */
    isSupported: boolean;
}
