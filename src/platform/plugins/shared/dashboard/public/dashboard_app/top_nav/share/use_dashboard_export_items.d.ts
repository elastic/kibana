import type { AppMenuPopoverItem } from '@kbn/core-chrome-app-menu-components';
import type { DashboardApi } from '../../../dashboard_api/types';
interface Props {
    dashboardApi: DashboardApi;
    objectId?: string;
    isDirty: boolean;
    dashboardTitle?: string;
}
export declare const useDashboardExportItems: ({ dashboardApi, objectId, isDirty, dashboardTitle, }: Props) => AppMenuPopoverItem[];
export {};
