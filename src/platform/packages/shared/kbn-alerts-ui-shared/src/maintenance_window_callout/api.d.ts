import type { KibanaServices, MaintenanceWindow } from './types';
export declare const fetchActiveMaintenanceWindows: (http: KibanaServices["http"], signal?: AbortSignal) => Promise<MaintenanceWindow[]>;
