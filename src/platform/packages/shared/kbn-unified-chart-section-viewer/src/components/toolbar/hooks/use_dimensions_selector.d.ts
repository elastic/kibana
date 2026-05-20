import type { ReactElement } from 'react';
import type { SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import type { Dimension, ParsedMetricItem } from '../../../types';
interface UseDimensionsSelectorParams {
    dimensions: Dimension[];
    selectedDimensions: Dimension[];
    onChange: (dimensions: Dimension[]) => void;
    singleSelection: boolean;
    isLoading: boolean;
    metricItems?: ParsedMetricItem[];
}
export interface UseDimensionsSelectorResult {
    options: SelectableEntry[];
    buttonLabel: ReactElement;
    buttonTooltipContent: ReactElement | undefined;
    popoverContentBelowSearch: ReactElement;
    handleChange: (chosenOption?: SelectableEntry | SelectableEntry[]) => void;
    selectedValues: string[];
}
/**
 * Encapsulates the dimensions picker's business logic so the component can
 * stay presentational. Owns:
 *   - local selection state (mirrors the controlled prop, lets the UI render
 *     optimistically while the debounced onChange catches up)
 *   - the optimistic applicable-dimension filter derived from `metricItems`
 *   - assembly of the `DimensionEntry[]` (orphans prepended, disabled-state
 *     tooltip overlay appended at the max limit)
 *   - change + clear handlers (debounced for multi-select, immediate for
 *     single)
 *   - the button label, tooltip, and popover footer nodes (rendered as
 *     dedicated components in `../dimensions_selector_components`)
 */
export declare const useDimensionsSelector: ({ dimensions, selectedDimensions, onChange, singleSelection, isLoading, metricItems, }: UseDimensionsSelectorParams) => UseDimensionsSelectorResult;
export {};
