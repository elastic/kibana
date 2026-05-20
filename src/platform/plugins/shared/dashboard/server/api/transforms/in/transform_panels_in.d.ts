import type { SavedObjectReference } from '@kbn/core/server';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import type { DashboardState } from '../../types';
export declare function transformPanelsIn(widgets: Required<DashboardState>['panels'], isDashboardAppRequest?: boolean): {
    panelsJSON: DashboardSavedObjectAttributes['panelsJSON'];
    sections: DashboardSavedObjectAttributes['sections'];
    references: SavedObjectReference[];
};
