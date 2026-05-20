import type { ViewMode } from '@kbn/presentation-publishing';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { DashboardState } from '../../common';
export declare const DASHBOARD_PANELS_UNSAVED_ID = "unsavedDashboard";
export type DashboardBackupState = Partial<DashboardState> & {
    viewMode?: ViewMode;
};
export interface DashboardBackupService {
    clearState: (id?: string) => void;
    getState: (id: string | undefined) => DashboardBackupState | undefined;
    setState: (id: string | undefined, backupState: DashboardBackupState) => void;
    getViewMode: () => ViewMode;
    storeViewMode: (viewMode: ViewMode) => void;
    getDashboardIdsWithUnsavedChanges: () => string[];
    dashboardHasUnsavedEdits: (id?: string) => boolean;
}
export declare const createDashboardBackupService: (spacesService?: SpacesApi) => Promise<DashboardBackupService>;
