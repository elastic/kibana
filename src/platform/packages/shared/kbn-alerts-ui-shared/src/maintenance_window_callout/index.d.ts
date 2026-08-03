import type { KibanaServices } from './types';
export declare const MAINTENANCE_WINDOWS_PAGE = "/app/management/insightsAndAlerting/maintenanceWindows";
export declare function MaintenanceWindowCallout({ kibanaServices, categories, }: {
    kibanaServices: KibanaServices;
    categories?: string[];
}): JSX.Element | null;
