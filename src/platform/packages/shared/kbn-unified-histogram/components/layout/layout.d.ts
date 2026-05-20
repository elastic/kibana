import type { PropsWithChildren, ReactNode } from 'react';
import React from 'react';
import type { UnifiedHistogramChartContext, UnifiedHistogramHitsContext, UnifiedHistogramTopPanelHeightContext } from '../../types';
export type UnifiedHistogramLayoutProps = PropsWithChildren<{
    /**
     * The rendered UnifiedHistogramChart component
     */
    unifiedHistogramChart: ReactNode;
    /**
     * Context object for the chart -- leave undefined to hide the chart
     */
    chart?: UnifiedHistogramChartContext;
    /**
     * Flag to indicate if the chart is available for rendering
     */
    isChartAvailable?: boolean;
    /**
     * Context object for the hits count -- leave undefined to hide the hits count
     */
    hits?: UnifiedHistogramHitsContext;
    /**
     * Current top panel height -- leave undefined to use the default
     */
    topPanelHeight?: UnifiedHistogramTopPanelHeightContext;
    /**
     * The default top panel height if `topPanelHeight` is not provided
     */
    defaultTopPanelHeight?: UnifiedHistogramTopPanelHeightContext;
    /**
     * Flag to indicate if the main panel is hidden -- only respected if a chart is provided
     */
    isMainPanelHidden?: boolean;
    /**
     * Callback to update the topPanelHeight prop when a resize is triggered
     */
    onTopPanelHeightChange?: (topPanelHeight: UnifiedHistogramTopPanelHeightContext) => void;
}>;
export declare const UnifiedHistogramLayout: ({ unifiedHistogramChart, chart, isChartAvailable, hits, topPanelHeight, defaultTopPanelHeight: originalDefaultTopPanelHeight, isMainPanelHidden, onTopPanelHeightChange, children, }: UnifiedHistogramLayoutProps) => React.JSX.Element;
