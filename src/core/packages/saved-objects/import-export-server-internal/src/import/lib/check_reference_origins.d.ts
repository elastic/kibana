import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { ImportStateMap } from './types';
export interface CheckReferenceOriginsParams {
    savedObjectsClient: SavedObjectsClientContract;
    typeRegistry: ISavedObjectTypeRegistry;
    namespace?: string;
    importStateMap: ImportStateMap;
}
export declare function checkReferenceOrigins(params: CheckReferenceOriginsParams): Promise<{
    importStateMap: ImportStateMap;
}>;
