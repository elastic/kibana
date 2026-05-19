import type { SavedObjectsType } from '@kbn/core/server';
import type { DashboardSavedObjectTypeMigrationsDeps } from './migrations/dashboard_saved_object_migrations';
export declare const createDashboardSavedObjectType: ({ migrationDeps, }: {
    migrationDeps: DashboardSavedObjectTypeMigrationsDeps;
}) => SavedObjectsType;
