import React from 'react';
import { type MetricsGridSettings } from '@kbn/discover-utils';
import type { Dimension, MetricsSort, UnifiedMetricsGridProps } from '../../../../../types';
import { type FlyoutState, type FlyoutTabId, type MetricsExperienceRestorableState } from '../../../../../restorable_state';
export interface MetricsExperienceStateContextValue extends MetricsExperienceRestorableState {
    profileId: string;
    gridSettings: MetricsGridSettings;
    recentlyExploredMetrics: readonly string[];
    onMetricExplored?: (metricUniqueKey: string) => void;
    onPageChange: (value: number) => void;
    onDimensionsChange: (value: Dimension[]) => void;
    onSearchTermChange: (value: string) => void;
    onMetricsSortChange: (value: MetricsSort) => void;
    onToggleFullscreen: () => void;
    onFlyoutStateChange: (value: FlyoutState | undefined) => void;
    onFlyoutSelectedTabChange: (value: FlyoutTabId) => void;
    onGridSettingsChange: (update: Partial<MetricsGridSettings>) => void;
}
export declare const MetricsExperienceStateContext: React.Context<MetricsExperienceStateContextValue | null>;
export declare function MetricsExperienceStateProvider({ children, profileId, gridSettings, onGridSettingsChange, getRecentlyExploredMetrics, onMetricExplored, discoverFetch$, }: {
    children: React.ReactNode;
    profileId: string;
    gridSettings?: MetricsGridSettings;
    onGridSettingsChange?: (update: Partial<MetricsGridSettings>) => void;
    getRecentlyExploredMetrics?: () => readonly string[];
    onMetricExplored?: (metricUniqueKey: string) => void;
    discoverFetch$?: UnifiedMetricsGridProps['fetch$'];
}): React.JSX.Element;
