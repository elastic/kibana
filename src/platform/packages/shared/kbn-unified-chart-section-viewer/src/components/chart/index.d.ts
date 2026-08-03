import type { LensLegendConfig, LensSeriesLayer, LensYBoundsConfig } from '@kbn/lens-embeddable-utils';
import React from 'react';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import type { LensWrapperProps } from './lens_wrapper';
import type { UnifiedMetricsGridProps } from '../../types';
export declare const ChartSizes: {
    s: number;
    m: number;
};
export type ChartSize = keyof typeof ChartSizes;
export type ChartProps = Pick<UnifiedMetricsGridProps, 'fetchParams'> & Omit<LensWrapperProps, 'lensProps' | 'abortController'> & {
    size?: ChartSize;
    discoverFetch$: UnifiedMetricsGridProps['fetch$'];
    esqlQuery: string;
    title: string;
    description?: string;
    chartLayers: LensSeriesLayer[];
    yBounds?: LensYBoundsConfig;
    legend?: LensLegendConfig;
    isLoading?: boolean;
    error?: Error;
    userMessages?: EmbeddableComponentProps['userMessages'];
    profileId: string;
    id: string;
    isSelected: boolean;
};
export declare const Chart: ({ services, onBrushEnd, onFilter, onViewDetails, onExploreInDiscoverTab, fetchParams, discoverFetch$, titleHighlight, size, esqlQuery, title, description, chartLayers, syncCursor, syncTooltips, yBounds, legend, extraDisabledActions, quickActionIds, isLoading, error, userMessages, profileId, id, isSelected, }: ChartProps) => React.JSX.Element;
