import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { MigrateFunction } from '@kbn/kibana-utils-plugin/common';
export declare const migrateByValueDashboardPanels: (migrate: MigrateFunction, version: string) => SavedObjectMigrationFn;
