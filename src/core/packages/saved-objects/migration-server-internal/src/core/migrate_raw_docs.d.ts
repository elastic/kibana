import type * as TaskEither from 'fp-ts/TaskEither';
import type { SavedObjectsRawDoc, ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { IDocumentMigrator } from '@kbn/core-saved-objects-base-server-internal';
import { TransformSavedObjectDocumentError } from '.';
type MigrateAndConvertFn = IDocumentMigrator['migrateAndConvert'];
export interface DocumentsTransformFailed {
    readonly type: string;
    readonly corruptDocumentIds: string[];
    readonly transformErrors: TransformErrorObjects[];
    readonly processedDocs: SavedObjectsRawDoc[];
}
export interface DocumentsTransformSuccess {
    readonly processedDocs: SavedObjectsRawDoc[];
}
export interface TransformErrorObjects {
    readonly rawId: string;
    readonly err: TransformSavedObjectDocumentError | Error;
}
/**
 * Error thrown when saved object migrations encounter a corrupt saved object.
 * Corrupt saved objects cannot be serialized because:
 *  - there's no `[type]` property which contains the type attributes
 *  - the type or namespace in the _id doesn't match the `type` or `namespace`
 *    properties
 */
export declare class CorruptSavedObjectError extends Error {
    readonly rawId: string;
    constructor(rawId: string);
}
/**
 * Applies the specified migration function to every saved object document in the list
 * of raw docs. Any raw docs that are not valid saved objects will simply be passed through.
 * @param {TransformFn} migrateDoc
 * @param {SavedObjectsRawDoc[]} rawDocs
 * @returns {SavedObjectsRawDoc[]}
 */
export declare function migrateRawDocs(serializer: ISavedObjectsSerializer, migrateDoc: MigrateAndConvertFn, rawDocs: SavedObjectsRawDoc[]): Promise<SavedObjectsRawDoc[]>;
interface MigrateRawDocsSafelyDeps {
    serializer: ISavedObjectsSerializer;
    migrateDoc: MigrateAndConvertFn;
    rawDocs: SavedObjectsRawDoc[];
}
/**
 * Applies the specified migration function to every saved object document provided
 * and converts the saved object to a raw document.
 * Captures the ids and errors from any documents that are not valid saved objects or
 * for which the transformation function failed.
 * @returns {TaskEither.TaskEither<DocumentsTransformFailed, DocumentsTransformSuccess>}
 */
export declare function migrateRawDocsSafely({ serializer, migrateDoc, rawDocs, }: MigrateRawDocsSafelyDeps): TaskEither.TaskEither<DocumentsTransformFailed, DocumentsTransformSuccess>;
export {};
