import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry, ISavedObjectsImporter, SavedObjectsImportOptions, SavedObjectsResolveImportErrorsOptions } from '@kbn/core-saved-objects-server';
import type { AccessControlImportTransformsFactory } from '@kbn/core-saved-objects-server/src/import';
/**
 * @internal
 */
export declare class SavedObjectsImporter implements ISavedObjectsImporter {
    #private;
    constructor({ savedObjectsClient, typeRegistry, importSizeLimit, logger, createAccessControlImportTransforms, }: {
        savedObjectsClient: SavedObjectsClientContract;
        typeRegistry: ISavedObjectTypeRegistry;
        importSizeLimit: number;
        logger: Logger;
        createAccessControlImportTransforms?: AccessControlImportTransformsFactory;
    });
    import({ readStream, createNewCopies, namespace, overwrite, refresh, compatibilityMode, managed, }: SavedObjectsImportOptions): Promise<SavedObjectsImportResponse>;
    resolveImportErrors({ readStream, createNewCopies, compatibilityMode, namespace, retries, managed, }: SavedObjectsResolveImportErrorsOptions): Promise<SavedObjectsImportResponse>;
}
