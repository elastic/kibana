import type { SavedObjectMigrationMap } from '@kbn/core/server';
import type { SearchSessionSavedObjectAttributes as SearchSessionSavedObjectAttributesLatest } from '../../../common';
import { SearchSessionStatus } from '../../../common';
/**
 * Search sessions were released in 7.12.0
 * In 7.13.0 a `completed` field was added.
 * It is a timestamp representing the session was transitioned into "completed" status.
 */
export type SearchSessionSavedObjectAttributesPre$7$13$0 = Omit<SearchSessionSavedObjectAttributesPre$7$14$0, 'completed'>;
/**
 * In 7.14.0 a `version` field was added. When search session is created it is populated with current kibana version.
 * It is used to display warnings when trying to restore a session from a different version
 * For saved object created before 7.14.0 we populate "7.13.0" inside the migration.
 * It is less then ideal because the saved object could have actually been created in "7.12.x" or "7.13.x",
 * but what is important for 7.14.0 is that the version is less then "7.14.0"
 */
export type SearchSessionSavedObjectAttributesPre$7$14$0 = Omit<SearchSessionSavedObjectAttributesPre$8$0$0, 'version'>;
/**
 * In 8.0.0, we migrated from using URL generators to the locators service. As a result, we move
 * from using `urlGeneratorId` to `locatorId`.
 */
export type SearchSessionSavedObjectAttributesPre$8$0$0 = Omit<SearchSessionSavedObjectAttributesPre$8$6$0, 'locatorId'> & {
    urlGeneratorId?: string;
};
/**
 * In 8.6.0 with search session refactoring and moving away from using task manager we are no longer track of:
 *  - `completed` - when session was completed
 *  - `persisted` - if session was saved
 *  - `touched` - when session was last updated (touched by the user)
 *  - `status` - status is no longer persisted. Except 'canceled' which was moved to `isCanceled`
 *  - `status` and `error` in idMapping (search info)
 */
export type SearchSessionSavedObjectAttributesPre$8$6$0 = Omit<SearchSessionSavedObjectAttributesLatest, 'idMapping' | 'isCanceled'> & {
    completed?: string | null;
    persisted: boolean;
    touched: string;
    status: SearchSessionStatus;
    idMapping: Record<string, {
        id: string;
        strategy: string;
        status: string;
        error?: string;
    }>;
};
export declare const searchSessionSavedObjectMigrations: SavedObjectMigrationMap;
