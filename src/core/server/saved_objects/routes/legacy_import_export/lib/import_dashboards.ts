/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject, SavedObjectsClientContract } from '../../../..';

export async function importDashboards(
  savedObjectsClient: SavedObjectsClientContract,
  objects: SavedObject[],
  { overwrite, exclude }: { overwrite: boolean; exclude: string[] }
) {
  // The server assumes that documents with no migrationVersion are up to date.
  // That assumption enables Kibana and other API consumers to not have to build
  // up migrationVersion prior to creating new objects. But it means that imports
  // need to set migrationVersion to something other than undefined, so that imported
  // docs are not seen as automatically up-to-date.
  const docs = objects
    .filter((item) => !exclude.includes(item.type))
    // filter out any document version, if present
    .map(({ version, ...doc }) => ({ ...doc, migrationVersion: doc.migrationVersion || {} }));

  const results = await savedObjectsClient.bulkCreate(docs, { overwrite });
  return { objects: results.saved_objects };
}
