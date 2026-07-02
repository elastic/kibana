import type { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { DashboardState } from '../../../common';
export interface DashboardSaveOptions {
    newTitle: string;
    newTags?: string[];
    newDescription: string;
    newCopyOnSave: boolean;
    newTimeRestore: boolean;
    newAccessMode?: SavedObjectAccessControl['accessMode'];
    newProjectRoutingRestore: boolean;
}
export type SavedDashboardSaveOpts = SavedObjectSaveOpts & {
    saveAsCopy?: boolean;
};
export interface SaveDashboardProps {
    dashboardState: DashboardState;
    saveOptions: SavedDashboardSaveOpts;
    lastSavedId?: string;
    accessMode?: SavedObjectAccessControl['accessMode'];
}
export interface SaveDashboardReturn {
    id?: string;
    error?: string;
    redirectRequired?: boolean;
}
