import type { ReactNode } from 'react';
import type { SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import type { Dimension, ParsedMetricItem } from '../../types';
/**
 * A `SelectableEntry` carrying the `Dimension` it was built from. Keeping the
 * dimension on the option lets `handleChange` read it back without a reverse
 * lookup against `dimensions` + `localSelectedDimensions`.
 */
export type DimensionEntry = SelectableEntry & {
    dimension: Dimension;
};
interface BuildDimensionOptionParams {
    dimension: Dimension;
    isSelected: boolean;
    isDisabled: boolean;
    appendNode?: ReactNode;
}
/**
 * Builds the `DimensionEntry` rendered by the toolbar selector. Kept as a
 * helper so the hook's `options` memo stays focused on partitioning and
 * disabled-state derivation.
 */
export declare const buildDimensionOption: ({ dimension, isSelected, isDisabled, appendNode, }: BuildDimensionOptionParams) => DimensionEntry;
interface OptionDisabledStateParams {
    singleSelection: boolean;
    isSelected: boolean;
    isAtMaxLimit: boolean;
}
/**
 * Determines if a dimension option should be disabled.
 * - In single-selection mode: never disabled
 * - Selected items: never disabled (can always deselect)
 * - Otherwise: disabled if not intersecting or at max limit
 */
export declare const getOptionDisabledState: ({ singleSelection, isSelected, isAtMaxLimit, }: OptionDisabledStateParams) => boolean;
/**
 * Returns the set of dimension names carried by at least one metric that
 * also carries every currently-selected dimension. Used by the picker to
 * optimistically hide options that, if selected, would produce an empty
 * grid — without waiting for the server round-trip.
 */
export declare const getApplicableDimensionNames: (metricItems: ParsedMetricItem[], selectedNames: readonly string[]) => Set<string>;
interface PartitionedDimensionsParams {
    dimensions: Dimension[];
    selectedDimensions: Dimension[];
    optimisticApplicableNames: Set<string> | null;
}
interface PartitionedDimensions {
    /** Selections not in the applicable set — always surfaced so the count badge matches the visible ticks. */
    orphanSelections: Dimension[];
    /** Applicable dimensions in their caller-provided order, narrowed by the optimistic filter when active. */
    applicableDimensions: Dimension[];
}
/**
 * Splits the picker's render list into orphaned selections (shown first,
 * alphabetically sorted) and applicable dimensions (caller order preserved).
 * Keeps the split pure so the component stays presentational.
 */
export declare const partitionDimensionsForRender: ({ dimensions, selectedDimensions, optimisticApplicableNames, }: PartitionedDimensionsParams) => PartitionedDimensions;
export {};
