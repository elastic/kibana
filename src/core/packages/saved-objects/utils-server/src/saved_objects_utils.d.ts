import type { SavedObjectsFindOptions, SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectMigration, SavedObjectMigrationFn, SavedObject } from '@kbn/core-saved-objects-server';
export declare const DEFAULT_NAMESPACE_STRING = "default";
export declare const ALL_NAMESPACES_STRING = "*";
export declare const FIND_DEFAULT_PAGE = 1;
export declare const FIND_DEFAULT_PER_PAGE = 20;
/**
 * @public
 */
export declare class SavedObjectsUtils {
    /**
     * Converts a given saved object namespace ID to its string representation. All namespace IDs have an identical string representation, with
     * the exception of the `undefined` namespace ID (which has a namespace string of `'default'`).
     *
     * @param namespace The namespace ID, which must be either a non-empty string or `undefined`.
     */
    static namespaceIdToString: (namespace?: string) => string;
    /**
     * Converts a given saved object namespace string to its ID representation. All namespace strings have an identical ID representation, with
     * the exception of the `'default'` namespace string (which has a namespace ID of `undefined`).
     *
     * @param namespace The namespace string, which must be non-empty.
     */
    static namespaceStringToId: (namespace: string) => string | undefined;
    /**
     * Creates an empty response for a find operation.
     */
    static createEmptyFindResponse: <T, A>({ page, perPage, }: SavedObjectsFindOptions) => SavedObjectsFindResponse<T, A>;
    /**
     * Generates a random ID for a saved objects.
     */
    static generateId(): string;
    /**
     * Validates that a saved object ID has been randomly generated.
     *
     * @param {string} id The ID of a saved object.
     * @todo Use `uuid.validate` once upgraded to v5.3+
     */
    static isRandomId(id: string | undefined): boolean;
    /**
     * Uses a single-namespace object's "legacy ID" to determine what its new ID will be after it is converted to a multi-namespace type.
     *
     * @param {string} namespace The namespace of the saved object before it is converted.
     * @param {string} type The type of the saved object before it is converted.
     * @param {string} id The ID of the saved object before it is converted.
     * @returns {string} The ID of the saved object after it is converted.
     */
    static getConvertedObjectId(namespace: string | undefined, type: string, id: string): string;
    /**
     * Gets the transform function from a migration object.
     * @param migration Migration object or a migration function.
     * @returns A migration function.
     */
    static getMigrationFunction<InputAttributes, MigratedAttributes>(migration: SavedObjectMigration<InputAttributes, MigratedAttributes>): SavedObjectMigrationFn<InputAttributes, MigratedAttributes>;
    static getName(nameAttribute: string, savedObject?: Pick<SavedObject<unknown>, 'attributes'> | null): string | undefined;
    static getIncludedNameFields(type: string, nameAttribute: string): string[];
}
