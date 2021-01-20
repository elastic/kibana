/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/*
 * This file provides logic for migrating raw documents.
 */

import {
  SavedObjectsRawDoc,
  SavedObjectsSerializer,
  SavedObjectUnsanitizedDoc,
} from '../../serialization';
import { TransformFn } from './document_migrator';
import { SavedObjectsMigrationLogger } from '.';

/**
 * Applies the specified migration function to every saved object document in the list
 * of raw docs. Any raw docs that are not valid saved objects will simply be passed through.
 *
 * @param {TransformFn} migrateDoc
 * @param {SavedObjectsRawDoc[]} rawDocs
 * @returns {SavedObjectsRawDoc[]}
 */
export async function migrateRawDocs(
  serializer: SavedObjectsSerializer,
  migrateDoc: TransformFn,
  rawDocs: SavedObjectsRawDoc[],
  log: SavedObjectsMigrationLogger
): Promise<SavedObjectsRawDoc[]> {
  const migrateDocWithoutBlocking = transformNonBlocking(migrateDoc);
  const processedDocs = [];
  for (const raw of rawDocs) {
    if (serializer.isRawSavedObject(raw)) {
      const savedObject = serializer.rawToSavedObject(raw);
      savedObject.migrationVersion = savedObject.migrationVersion || {};
      processedDocs.push(
        serializer.savedObjectToRaw({
          references: [],
          ...(await migrateDocWithoutBlocking(savedObject)),
        })
      );
    } else {
      log.error(
        `Error: Unable to migrate the corrupt Saved Object document ${raw._id}. To prevent Kibana from performing a migration on every restart, please delete or fix this document by ensuring that the namespace and type in the document's id matches the values in the namespace and type fields.`,
        { rawDocument: raw }
      );
      processedDocs.push(raw);
    }
  }
  return processedDocs;
}

/**
 * Migration transform functions are potentially CPU heavy e.g. doing decryption/encryption
 * or (de)/serializing large JSON payloads.
 * Executing all transforms for a batch in a synchronous loop can block the event-loop for a long time.
 * To prevent this we use setImmediate to ensure that the event-loop can process other parallel
 * work in between each transform.
 */
function transformNonBlocking(
  transform: TransformFn
): (doc: SavedObjectUnsanitizedDoc) => Promise<SavedObjectUnsanitizedDoc> {
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
