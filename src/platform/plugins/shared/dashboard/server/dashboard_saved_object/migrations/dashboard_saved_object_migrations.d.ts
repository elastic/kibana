import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { SavedObjectMigrationMap } from '@kbn/core/server';
export interface DashboardSavedObjectTypeMigrationsDeps {
    embeddable: EmbeddableSetup;
}
export declare const createDashboardSavedObjectTypeMigrations: (deps: DashboardSavedObjectTypeMigrationsDeps) => SavedObjectMigrationMap;
