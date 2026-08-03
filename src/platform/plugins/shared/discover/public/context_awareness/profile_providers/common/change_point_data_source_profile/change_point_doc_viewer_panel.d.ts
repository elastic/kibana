import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { ChangePointChartSectionActions } from '@kbn/change-point-chart-viewer';
import type { ChangePointChartSectionProps$ } from './change_point_context';
interface ChangePointDocViewerPanelProps {
    record: DataTableRecord;
    context: {
        chartSectionProps$: ChangePointChartSectionProps$;
    };
    actions: ChangePointChartSectionActions;
}
/**
 * Doc viewer tab rendered inside the Discover row flyout when the change point
 * data source profile is active. Subscribes to the profile-scoped chart section
 * props and delegates rendering to {@link ChangePointChartForRow}.
 */
export declare const ChangePointDocViewerPanel: React.FC<ChangePointDocViewerPanelProps>;
export {};
