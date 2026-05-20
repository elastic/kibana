import { type LensSeriesLayer, type LensYBoundsConfig } from '@kbn/lens-embeddable-utils';
import type React from 'react';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import type { UnifiedMetricsGridProps } from '../../../types';
export type LensProps = Pick<EmbeddableComponentProps, 'id' | 'viewMode' | 'timeRange' | 'attributes' | 'esqlVariables' | 'noPadding' | 'searchSessionId' | 'executionContext' | 'lastReloadRequestTime' | 'userMessages' | 'description'>;
export declare const useLensProps: ({ chartId, title, description, query, services, fetchParams, discoverFetch$, chartRef, chartLayers, yBounds, error, userMessages, profileId, }: {
    chartId: string;
    title: string;
    description?: string;
    query: string;
    discoverFetch$: UnifiedMetricsGridProps["fetch$"];
    chartRef?: React.RefObject<HTMLDivElement>;
    chartLayers: LensSeriesLayer[];
    yBounds?: LensYBoundsConfig;
    error?: Error;
    userMessages?: EmbeddableComponentProps["userMessages"];
    profileId: string;
} & Pick<UnifiedMetricsGridProps, "services" | "fetchParams">) => LensProps | undefined;
