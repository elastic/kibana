import type { SavedObjectReference } from '@kbn/core/server';
import type { SavedDashboardSection } from '../../../dashboard_saved_object';
import type { DashboardState } from '../../types';
import type { Warnings } from '../../types';
export declare function transformPanelsOut(panelsJSON?: string, sections?: SavedDashboardSection[], containerReferences?: SavedObjectReference[], isDashboardAppRequest?: boolean): {
    panels: DashboardState['panels'];
    warnings: Warnings;
};
