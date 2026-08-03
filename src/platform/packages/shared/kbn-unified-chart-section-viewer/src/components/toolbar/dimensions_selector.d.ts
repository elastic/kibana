import React from 'react';
import type { Dimension, ParsedMetricItem } from '../../types';
interface DimensionsSelectorProps {
    dimensions: Dimension[];
    selectedDimensions: Dimension[];
    fullWidth?: boolean;
    onChange: (dimensions: Dimension[]) => void;
    singleSelection?: boolean;
    isLoading?: boolean;
    /**
     * When provided, the option list is filtered on the client to dimensions
     * carried by at least one metric that also carries every current selection,
     * preventing rapid multi-select from reaching an empty-grid state. Selected
     * dimensions not in the applicable set always stay visible regardless of
     * this prop (e.g. after URL restore).
     */
    metricItems?: ParsedMetricItem[];
}
export declare const DimensionsSelector: ({ dimensions, selectedDimensions, onChange, fullWidth, singleSelection, isLoading, metricItems, }: DimensionsSelectorProps) => React.JSX.Element;
export {};
