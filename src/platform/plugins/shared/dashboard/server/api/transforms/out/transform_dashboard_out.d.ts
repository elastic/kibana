import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import type { DashboardState } from '../../types';
import type { Warnings } from '../../types';
export declare function transformDashboardOut(attributes: DashboardSavedObjectAttributes | Partial<DashboardSavedObjectAttributes>, references?: SavedObjectReference[], isDashboardAppRequest?: boolean): {
    dashboardState: Partial<Omit<DashboardState, 'options'> & {
        options: Partial<DashboardState['options']>;
    }>;
    warnings: Warnings;
};
