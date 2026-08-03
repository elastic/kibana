import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import type { getDashboardStateSchema } from '../../dashboard_state_schemas';
import type { DashboardState, Warnings } from '../../types';
export declare function transformDashboardOut(attributes: DashboardSavedObjectAttributes | Partial<DashboardSavedObjectAttributes>, references: SavedObjectReference[] | undefined, isDashboardAppRequest: boolean | undefined, strictValidationSchema: ReturnType<typeof getDashboardStateSchema>, useGASchemas?: boolean): {
    dashboardState: DashboardState;
    warnings: Warnings;
};
