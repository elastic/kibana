import type { Criteria } from '@elastic/eui';
import { type ContentListItem } from '@kbn/content-list-provider';
/**
 * Hook to handle table sorting configuration and changes.
 *
 * Integrates with {@link useContentListSort} from the provider to manage sort state.
 *
 * @returns Object containing:
 *   - `sorting` - Configuration object for `EuiBasicTable`'s `sorting` prop.
 *   - `onChange` - Handler for `EuiBasicTable`'s `onChange` event to update sort.
 */
export declare const useSorting: () => {
    sorting?: {
        sort: {
            field: string;
            direction: "asc" | "desc";
        };
    };
    onChange: (criteria: Criteria<ContentListItem>) => void;
};
