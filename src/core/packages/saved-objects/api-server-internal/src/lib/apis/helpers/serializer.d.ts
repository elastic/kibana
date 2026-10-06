import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ISavedObjectTypeRegistry, ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { SavedObject, SavedObjectsRawDoc, SavedObjectsRawDocParseOptions } from '@kbn/core-saved-objects-server';
export type ISerializerHelper = PublicMethodsOf<SerializerHelper>;
export declare class SerializerHelper {
    private registry;
    private serializer;
    constructor({ registry, serializer, }: {
        registry: ISavedObjectTypeRegistry;
        serializer: ISavedObjectsSerializer;
    });
    rawToSavedObject<T = unknown>(raw: SavedObjectsRawDoc, options?: SavedObjectsRawDocParseOptions): SavedObject<T>;
}
