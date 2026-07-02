import type { DrilldownState } from '@kbn/embeddable-plugin/server';
import type { TypeOf } from '@kbn/config-schema';
import type { dashboardDrilldownSchema } from './schemas';
export type DashboardDrilldownState = DrilldownState & TypeOf<typeof dashboardDrilldownSchema>;
export type StoredDashboardDrilldownState = Omit<DashboardDrilldownState, 'dashboard_id'> & {
    dashboardRefName: string;
};
