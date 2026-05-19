import React from 'react';
import type { Dimension, ParsedMetricItem, UnifiedMetricsGridProps } from '../../../types';
interface UseToolbarActionsProps extends Pick<UnifiedMetricsGridProps, 'renderToggleActions'> {
    allDimensions: Dimension[];
    onDimensionsChange?: (dimensions: Dimension[]) => void;
    hideDimensionsSelector?: boolean;
    hideRightSideActions?: boolean;
    isLoading?: boolean;
    /** Forwarded to {@link DimensionsSelector}; see its prop docs. */
    metricItems?: ParsedMetricItem[];
}
export declare const useToolbarActions: ({ allDimensions, renderToggleActions, onDimensionsChange: onDimensionsChangeProp, hideDimensionsSelector, hideRightSideActions, isLoading, metricItems, }: UseToolbarActionsProps) => {
    toggleActions: React.ReactElement<any, string | React.JSXElementConstructor<any>> | undefined;
    leftSideActions: (React.JSX.Element | null)[];
    rightSideActions: import("@kbn/shared-ux-button-toolbar").IconButton[];
};
export {};
