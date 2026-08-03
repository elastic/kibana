import type { BehaviorSubject } from 'rxjs';
import type { UnifiedChangePointGridProps } from '@kbn/change-point-chart-viewer';
export declare const CHANGE_POINT_DATA_SOURCE_PROFILE_ID = "change-point-data-source-profile";
/**
 * Snapshot of the chart section props shared from `getChartSectionConfiguration` to
 * `getDocViewer` via the profile context. Contains only the fields the flyout tab needs.
 */
export type ChangePointChartSectionSnapshot = Pick<UnifiedChangePointGridProps, 'fetchParams' | 'fetch$' | 'services' | 'onBrushEnd' | 'onFilter'>;
export type ChangePointChartSectionProps$ = BehaviorSubject<ChangePointChartSectionSnapshot | undefined>;
