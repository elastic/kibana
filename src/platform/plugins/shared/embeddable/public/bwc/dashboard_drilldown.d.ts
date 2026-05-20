import type { Reference } from '@kbn/content-management-utils/src/types';
import type { DrilldownState } from '../../server';
export declare function transformDashboardDrilldown(urlState: DrilldownState & {
    dashboardRefName?: string;
}, references?: Reference[]): (DrilldownState & {
    dashboardRefName?: string;
}) | {
    dashboard_id: string;
    label: string;
    trigger: string;
    type: string;
};
