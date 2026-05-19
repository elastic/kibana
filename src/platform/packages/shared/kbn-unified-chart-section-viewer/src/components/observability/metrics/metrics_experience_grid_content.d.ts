import React from 'react';
import type { Dimension, ParsedMetricItem, UnifiedMetricsGridProps } from '../../../types';
export interface MetricsExperienceGridContentProps extends Pick<UnifiedMetricsGridProps, 'services' | 'fetchParams' | 'onBrushEnd' | 'onFilter' | 'actions' | 'histogramCss'> {
    discoverFetch$: UnifiedMetricsGridProps['fetch$'];
    metricItems: ParsedMetricItem[];
    activeDimensions: Dimension[];
    isDiscoverLoading?: boolean;
    isTabSelected: boolean;
}
export declare const MetricsExperienceGridContent: ({ metricItems, activeDimensions, services, discoverFetch$, fetchParams, onBrushEnd, onFilter, actions, histogramCss, isDiscoverLoading, isTabSelected, }: MetricsExperienceGridContentProps) => React.JSX.Element;
