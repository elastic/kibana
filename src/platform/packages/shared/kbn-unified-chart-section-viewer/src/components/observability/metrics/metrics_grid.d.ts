import React from 'react';
import type { EuiFlexGridProps } from '@elastic/eui';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import type { Dimension, UnifiedMetricsGridProps, ParsedMetricItem } from '../../../types';
export type MetricsGridProps = Pick<UnifiedMetricsGridProps, 'services' | 'onBrushEnd' | 'onFilter' | 'fetchParams' | 'actions'> & {
    dimensions: Dimension[];
    searchTerm?: string;
    columns: NonNullable<EuiFlexGridProps['columns']>;
    discoverFetch$: UnifiedMetricsGridProps['fetch$'];
    metricItems: ParsedMetricItem[];
    whereStatements?: string[];
    getUserMessages?: (metricItem: ParsedMetricItem) => EmbeddableComponentProps['userMessages'];
    getDescription?: (metricItem: ParsedMetricItem) => EmbeddableComponentProps['description'];
    /**
     * Whether the owning Discover tab is the currently active one.
     *
     * Discover keeps inactive tabs' chart sections mounted to preserve internal
     * state (e.g. Lens), so without this gate every tab with a persisted flyout
     * would render its own `MetricInsightsFlyout` into `document.body` via
     * `EuiPortal`, causing visual collisions and event-capture conflicts across
     * tabs (e.g. opening a flyout in tab A would close the flyout in tab B,
     * and duplicating a tab would lose the persisted flyout).
     *
     */
    isTabSelected: boolean;
};
export declare const MetricsGrid: ({ metricItems, onBrushEnd, onFilter, actions, dimensions, whereStatements, services, columns, fetchParams, discoverFetch$, searchTerm, getUserMessages, getDescription, isTabSelected, }: MetricsGridProps) => React.JSX.Element;
