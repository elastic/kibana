import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type { CreatedObject, SavedObject } from '@kbn/core-saved-objects-server';
import type { LegacyUrlAlias } from '@kbn/core-saved-objects-base-server-internal';
export declare function extractErrors(savedObjectResults: Array<CreatedObject<unknown>>, savedObjectsToImport: Array<SavedObject<any>>, legacyUrlAliasResults: SavedObject[], legacyUrlAliasesToCreate: Map<string, SavedObject<LegacyUrlAlias>>): SavedObjectsImportFailure[];
