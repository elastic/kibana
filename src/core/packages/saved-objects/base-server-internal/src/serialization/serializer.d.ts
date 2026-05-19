import type { ISavedObjectsSerializer, SavedObjectsRawDoc, SavedObjectSanitizedDoc, SavedObjectsRawDocParseOptions } from '@kbn/core-saved-objects-server';
import type { ISavedObjectTypeRegistryInternal } from '../saved_objects_type_registry';
/**
 * Core internal implementation of {@link ISavedObjectsSerializer}
 *
 * @remarks Serializer instances should only be created and accessed by calling {@link SavedObjectsServiceStart.createSerializer}
 *
 * @internal
 */
export declare class SavedObjectsSerializer implements ISavedObjectsSerializer {
    private readonly registry;
    /**
     * @internal
     */
    constructor(registry: ISavedObjectTypeRegistryInternal);
    /**
     * Determines whether or not the raw document can be converted to a saved object.
     *
     * @param {SavedObjectsRawDoc} doc - The raw ES document to be tested
     * @param {SavedObjectsRawDocParseOptions} options - Options for parsing the raw document.
     */
    isRawSavedObject(doc: SavedObjectsRawDoc, options?: SavedObjectsRawDocParseOptions): boolean;
    private checkIsRawSavedObject;
    /**
     * Converts a document from the format that is stored in elasticsearch to the saved object client format.
     *
     * @param {SavedObjectsRawDoc} doc - The raw ES document to be converted to saved object format.
     * @param {SavedObjectsRawDocParseOptions} options - Options for parsing the raw document.
     */
    rawToSavedObject<T = unknown>(doc: SavedObjectsRawDoc, options?: SavedObjectsRawDocParseOptions): SavedObjectSanitizedDoc<T>;
    /**
     * Converts a document from the saved object client format to the format that is stored in elasticsearch.
     *
     * @param {SavedObjectSanitizedDoc} savedObj - The saved object to be converted to raw ES format.
     */
    savedObjectToRaw(savedObj: SavedObjectSanitizedDoc): SavedObjectsRawDoc;
    /**
     * Given a saved object type and id, generates the compound id that is stored in the raw document.
     *
     * @param {string} namespace - The namespace of the saved object
     * @param {string} type - The saved object type
     * @param {string} id - The id of the saved object
     */
    generateRawId(namespace: string | undefined, type: string, id: string): string;
    /**
     * Given a saved object type and id, generates the compound id that is stored in the raw document for its legacy URL alias.
     *
     * @param {string} namespace - The namespace of the saved object
     * @param {string} type - The saved object type
     * @param {string} id - The id of the saved object
     */
    generateRawLegacyUrlAliasId(namespace: string | undefined, type: string, id: string): string;
    /**
     * Given a document's source namespace, type, and raw ID, trim the ID prefix (based on the namespaceType), returning the object ID and the
     * detected namespace. A single-namespace object is only considered to exist in a namespace if its raw ID is prefixed by that *and* it has
     * the namespace field in its source.
     */
    private trimIdPrefix;
    private parseIdPrefix;
}
