import React from 'react';
import type { ChangePointChartSectionActions, UnifiedChangePointGridProps } from '@kbn/change-point-chart-viewer';
import type { ChangePointChartSectionProps$ } from './change_point_context';
interface ChangePointChartSectionSyncProps {
    gridProps: UnifiedChangePointGridProps;
    actions: ChangePointChartSectionActions;
    chartSectionProps$: ChangePointChartSectionProps$;
}
/**
 * Thin wrapper around {@link LazyChangePointExperienceGrid} that synchronises the
 * chart section's runtime props into a profile-scoped BehaviorSubject so the flyout
 * doc viewer tab can access them without prop-drilling through the doc viewer API.
 *
 * The `useEffect` fires only when `fetchParams` changes (i.e. on each Discover
 * refetch), not on every render, because `fetchParams` is a stable object between
 * fetches.
 */
export declare const ChangePointChartSectionSync: React.FC<ChangePointChartSectionSyncProps>;
export {};
