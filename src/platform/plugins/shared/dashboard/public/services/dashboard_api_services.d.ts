import { type DashboardBackupService } from './dashboard_backup_service';
export declare const getDashboardBackupService: () => DashboardBackupService;
/**
 * Initializes Dashboard API service singletons if they haven't been initialized already.
 */
export declare const initializeDashboardApiServices: () => Promise<undefined>;
