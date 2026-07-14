import { type Type } from '@kbn/config-schema';
import type { SavedObjectsValidationSpec, SavedObjectSanitizedDoc } from '@kbn/core-saved-objects-server';
type SavedObjectSanitizedDocSchema = {
    [K in keyof Required<SavedObjectSanitizedDoc>]: Type<SavedObjectSanitizedDoc[K]>;
};
/**
 * Takes a {@link SavedObjectsValidationSpec} and returns a full schema representing
 * a {@link SavedObjectSanitizedDoc}, with the spec applied to the object's `attributes`.
 *
 * @internal
 */
export declare const createSavedObjectSanitizedDocSchema: (attributesSchema: SavedObjectsValidationSpec | undefined) => import("@kbn/config-schema").ObjectType<SavedObjectSanitizedDocSchema> | import("@kbn/config-schema").ObjectType<Omit<SavedObjectSanitizedDocSchema, "attributes"> & {
    attributes: SavedObjectsValidationSpec;
}>;
export {};
