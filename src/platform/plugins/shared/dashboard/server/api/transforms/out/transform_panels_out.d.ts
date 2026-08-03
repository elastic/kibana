import type { SavedObjectReference } from '@kbn/core/server';
import type { SavedDashboardSection } from '../../../dashboard_saved_object';
import type { DashboardState, Warnings } from '../../types';
export declare function transformPanelsOut(panelsJSON?: string, sections?: SavedDashboardSection[], containerReferences?: SavedObjectReference[], isDashboardAppRequest?: boolean, useGASchemas?: boolean): {
    panels: DashboardState['panels'];
    warnings: Warnings;
};
