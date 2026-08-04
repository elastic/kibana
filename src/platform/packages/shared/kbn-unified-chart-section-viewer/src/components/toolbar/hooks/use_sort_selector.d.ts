import type { SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import type { MetricsSort, MetricsSortDirection } from '../../../types';
interface UseSortSelectorParams {
    sort: MetricsSort;
    onChange: (sort: MetricsSort) => void;
}
export interface UseSortSelectorResult {
    options: SelectableEntry[];
    buttonLabel: string;
    selectedValue: string;
    handleSortByChange: (chosenOption?: SelectableEntry) => void;
    handleDirectionChange: (direction: MetricsSortDirection) => void;
}
export declare const useSortSelector: ({ sort, onChange, }: UseSortSelectorParams) => UseSortSelectorResult;
export {};
