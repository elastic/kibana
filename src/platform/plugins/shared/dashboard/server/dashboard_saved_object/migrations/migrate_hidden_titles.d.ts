import type { SavedObjectMigrationFn } from '@kbn/core/server';
/**
 * Before 7.10, hidden panel titles were stored as a blank string on the title attribute. In 7.10, this was replaced
 * with a usage of the existing hidePanelTitles key. Even though blank string titles still technically work
 * in versions > 7.10, they are less explicit than using the hidePanelTitles key. This migration transforms all
 * blank string titled panels to panels with the titles explicitly hidden.
 */
export declare const migrateExplicitlyHiddenTitles: SavedObjectMigrationFn<any, any>;
