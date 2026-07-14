import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
export interface OutdatedDocumentsQueryParams {
    coreMigrationVersionPerType: SavedObjectsMigrationVersion;
    migrationVersionPerType: SavedObjectsMigrationVersion;
}
export declare function getOutdatedDocumentsQuery({ coreMigrationVersionPerType, migrationVersionPerType, }: OutdatedDocumentsQueryParams): QueryDslQueryContainer;
