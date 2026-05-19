import type { Readable } from 'stream';
import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type { ISavedObjectTypeRegistry, SavedObject } from '@kbn/core-saved-objects-server';
import type { AccessControlImportTransformsFactory } from '@kbn/core-saved-objects-server/src/import';
import type { ImportStateMap } from './types';
interface CollectSavedObjectsOptions {
    readStream: Readable;
    objectLimit: number;
    filter?: (obj: SavedObject) => boolean;
    supportedTypes: string[];
    managed?: boolean;
    typeRegistry: ISavedObjectTypeRegistry;
    createAccessControlImportTransforms?: AccessControlImportTransformsFactory;
}
export declare function collectSavedObjects({ readStream, objectLimit, filter, supportedTypes, managed, typeRegistry, createAccessControlImportTransforms, }: CollectSavedObjectsOptions): Promise<{
    errors: SavedObjectsImportFailure[];
    collectedObjects: SavedObject<{
        title?: string;
    }>[];
    importStateMap: ImportStateMap;
}>;
export {};
