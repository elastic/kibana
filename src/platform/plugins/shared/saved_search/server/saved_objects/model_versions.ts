/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsModelVersionMap,
  SavedObjectTypeVersionGuesser,
} from '@kbn/core-saved-objects-server';
import { LEGACY_MODEL_VERSIONS } from './schema_legacy';
import { DISCOVER_SESSION_MODEL_VERSIONS } from './schema';

export const MODEL_VERSIONS: SavedObjectsModelVersionMap = {
  ...LEGACY_MODEL_VERSIONS,
  ...DISCOVER_SESSION_MODEL_VERSIONS,
};

// Sort model version schemas from latest to oldest,
// since the guesser tries to match the latest valid schema
const modelVersionsArray = Object.entries(MODEL_VERSIONS)
  .toSorted(([a], [b]) => Number(b) - Number(a))
  .map(([version, { schemas }]) => ({
    version: Number(version),
    schema: schemas?.create,
  }));

export const typeVersionGuesser: SavedObjectTypeVersionGuesser = (document) => {
  // Try to match the document against each model version schema,
  // starting from the latest one and working backwards
  for (const { version, schema } of modelVersionsArray) {
    if (schema) {
      try {
        schema.validate(document.attributes);
        return version;
      } catch {
        // Schema validation failed, try the next one
      }
    }
  }

  // Preserve the pre-guesser fallback and return
  // the latest version when no schema matches
  return modelVersionsArray[0].version;
};
