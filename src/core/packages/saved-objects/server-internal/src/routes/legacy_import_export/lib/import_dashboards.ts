/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

export async function importDashboards(
  savedObjectsClient: SavedObjectsClientContract,
  objects: SavedObject[],
  { overwrite, exclude }: { overwrite: boolean; exclude: string[] }
) {
  // The server assumes that documents with no `typeMigrationVersion` are up to date.
  // That assumption enables Kibana and other API consumers to not have to determine
  // `typeMigrationVersion` prior to creating new objects. But it means that imports
  // need to set `typeMigrationVersion` to something other than undefined, so that imported
  // docs are not seen as automatically up-to-date.
  const docs = objects
    .filter((item) => !exclude.includes(item.type))
    // filter out any document version and managed, if present
    .map(({ version, managed, ...doc }) => ({
      ...doc,
      ...(!doc.migrationVersion && !doc.typeMigrationVersion ? { typeMigrationVersion: '' } : {}),
    }));

  const results = await savedObjectsClient.bulkCreate(docs, { overwrite });
  return { objects: results.saved_objects };
}
