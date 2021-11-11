/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * This file provides logic for migrating raw documents.
 */
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Either from 'fp-ts/lib/Either';
import {
  SavedObjectSanitizedDoc,
  SavedObjectsRawDoc,
  SavedObjectsSerializer,
  SavedObjectUnsanitizedDoc,
} from '../../serialization';
import { MigrateAndConvertFn } from './document_migrator';
import { TransformSavedObjectDocumentError } from '.';

export interface DocumentsTransformFailed {
  readonly type: string;
  readonly corruptDocumentIds: string[];
  readonly transformErrors: TransformErrorObjects[];
}

export interface DocumentsTransformSuccess {
  readonly processedDocs: SavedObjectsRawDoc[];
}

export interface TransformErrorObjects {
  readonly rawId: string;
  readonly err: TransformSavedObjectDocumentError | Error;
}

type MigrateFn = (
  doc: SavedObjectUnsanitizedDoc<unknown>
) => Promise<Array<SavedObjectUnsanitizedDoc<unknown>>>;

/**
 * Error thrown when saved object migrations encounter a corrupt saved object.
 * Corrupt saved objects cannot be serialized because:
 *  - there's no `[type]` property which contains the type attributes
 *  - the type or namespace in the _id doesn't match the `type` or `namespace`
 *    properties
 */
export class CorruptSavedObjectError extends Error {
  constructor(public readonly rawId: string) {
    super(`Unable to migrate the corrupt saved object document with _id: '${rawId}'.`);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, CorruptSavedObjectError.prototype);
  }
}

/**
 * Applies the specified migration function to every saved object document in the list
 * of raw docs. Any raw docs that are not valid saved objects will simply be passed through.
 * @param {TransformFn} migrateDoc
 * @param {SavedObjectsRawDoc[]} rawDocs
 * @returns {SavedObjectsRawDoc[]}
 */
export async function migrateRawDocs(
  serializer: SavedObjectsSerializer,
  migrateDoc: MigrateAndConvertFn,
  rawDocs: SavedObjectsRawDoc[]
): Promise<SavedObjectsRawDoc[]> {
  const migrateDocWithoutBlocking = transformNonBlocking(migrateDoc);
  const processedDocs = [];
  for (const raw of rawDocs) {
    const options = { namespaceTreatment: 'lax' as const };
    if (serializer.isRawSavedObject(raw, options)) {
      const savedObject = convertToRawAddMigrationVersion(raw, options, serializer);
      processedDocs.push(
        ...(await migrateMapToRawDoc(migrateDocWithoutBlocking, savedObject, serializer))
      );
    } else {
      throw new CorruptSavedObjectError(raw._id);
    }
  }
  return processedDocs;
}

interface MigrateRawDocsSafelyDeps {
  serializer: SavedObjectsSerializer;
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
export function migrateRawDocsSafely({
  serializer,
  migrateDoc,
  rawDocs,
}: MigrateRawDocsSafelyDeps): TaskEither.TaskEither<
  DocumentsTransformFailed,
  DocumentsTransformSuccess
> {
  return async () => {
    const migrateDocNonBlocking = transformNonBlocking(migrateDoc);
    const processedDocs: SavedObjectsRawDoc[] = [];
    const transformErrors: TransformErrorObjects[] = [];
    const corruptSavedObjectIds: string[] = [];
    const options = { namespaceTreatment: 'lax' as const };
    for (const raw of rawDocs) {
      if (serializer.isRawSavedObject(raw, options)) {
        try {
          const savedObject = convertToRawAddMigrationVersion(raw, options, serializer);
          processedDocs.push(
            ...(await migrateMapToRawDoc(migrateDocNonBlocking, savedObject, serializer))
          );
        } catch (err) {
          if (err instanceof TransformSavedObjectDocumentError) {
            // the doc id we get from the error is only the uuid part
            // we use the original raw document _id instead
            transformErrors.push({
              rawId: raw._id,
              err,
            });
          } else {
            transformErrors.push({ rawId: raw._id, err }); // cases we haven't accounted for yet
          }
        }
      } else {
        corruptSavedObjectIds.push(raw._id);
      }
    }
    if (corruptSavedObjectIds.length > 0 || transformErrors.length > 0) {
      return Either.left({
        type: 'documents_transform_failed',
        corruptDocumentIds: [...corruptSavedObjectIds],
        transformErrors,
      });
    }
    return Either.right({ processedDocs });
  };
}

/**
 * Migration transform functions are potentially CPU heavy e.g. doing decryption/encryption
 * or (de)/serializing large JSON payloads.
 * Executing all transforms for a batch in a synchronous loop can block the event-loop for a long time.
 * To prevent this we use setImmediate to ensure that the event-loop can process other parallel
 * work in between each transform.
 */
function transformNonBlocking(
  transform: MigrateAndConvertFn
): (doc: SavedObjectUnsanitizedDoc) => Promise<SavedObjectUnsanitizedDoc[]> {
  // promises aren't enough to unblock the event loop
  return (doc: SavedObjectUnsanitizedDoc) =>
    new Promise((resolve, reject) => {
      // set immediate is though
      setImmediate(() => {
        try {
          resolve(transform(doc));
        } catch (e) {
          reject(e);
        }
      });
    });
}

/**
 * Applies the specified migration function to every saved object document provided
 * and converts the saved object to a raw document
 * @param {MigrateFn} transformNonBlocking
 * @param {SavedObjectsRawDoc[]} rawDoc
 * @returns {Promise<SavedObjectsRawDoc[]>}
 */
async function migrateMapToRawDoc(
  migrateMethod: MigrateFn,
  savedObject: SavedObjectSanitizedDoc<unknown>,
  serializer: SavedObjectsSerializer
): Promise<SavedObjectsRawDoc[]> {
  return [...(await migrateMethod(savedObject))].map((attrs) =>
    serializer.savedObjectToRaw({
      references: [],
      ...attrs,
    })
  );
}

/**
 * Sanitizes the raw saved object document
 * @param {SavedObjectRawDoc} rawDoc
 * @param options
 * @param {SavedObjectsSerializer} serializer
 * @returns {SavedObjectSanitizedDoc<unknown>}
 */
function convertToRawAddMigrationVersion(
  rawDoc: SavedObjectsRawDoc,
  options: { namespaceTreatment: 'lax' },
  serializer: SavedObjectsSerializer
): SavedObjectSanitizedDoc<unknown> {
  const savedObject = serializer.rawToSavedObject(rawDoc, options);
  savedObject.migrationVersion = savedObject.migrationVersion || {};
  return savedObject;
}
