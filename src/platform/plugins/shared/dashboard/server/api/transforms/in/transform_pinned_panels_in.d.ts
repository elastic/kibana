import type { Reference } from '@kbn/content-management-utils';
import { type DashboardState } from '../../../../common';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object/schema';
type PinnedPanelsState = Required<DashboardState>['pinned_panels'];
export declare function transformPinnedPanelsIn(pinnedPanels: PinnedPanelsState): {
    pinnedPanels: Required<DashboardSavedObjectAttributes>['pinned_panels']['panels'];
    references: Reference[];
};
export {};
