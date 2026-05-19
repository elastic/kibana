import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { RequestTiming } from '@kbn/core-http-server';
import type { DashboardState } from '../../types';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
export declare const transformDashboardIn: (dashboardState: Partial<DashboardState>, isDashboardAppRequest?: boolean, serverTiming?: RequestTiming) => {
    attributes: DashboardSavedObjectAttributes;
    references: SavedObjectReference[];
};
