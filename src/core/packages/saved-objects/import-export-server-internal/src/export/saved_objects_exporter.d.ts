import type { Readable } from 'stream';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectsExporter, ISavedObjectTypeRegistry, SavedObjectsExportByObjectOptions, SavedObjectsExportByTypeOptions } from '@kbn/core-saved-objects-server';
/**
 * @internal
 */
export declare class SavedObjectsExporter implements ISavedObjectsExporter {
    #private;
    constructor({ savedObjectsClient, typeRegistry, exportSizeLimit, logger, }: {
        savedObjectsClient: SavedObjectsClientContract;
        typeRegistry: ISavedObjectTypeRegistry;
        exportSizeLimit: number;
        logger: Logger;
    });
    exportByTypes(options: SavedObjectsExportByTypeOptions): Promise<Readable>;
    exportByObjects(options: SavedObjectsExportByObjectOptions): Promise<Readable>;
    private processObjects;
    private fetchByObjects;
    private fetchByTypes;
}
