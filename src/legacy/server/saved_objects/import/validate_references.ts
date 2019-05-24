/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Boom from 'boom';
import { SavedObject, SavedObjectsClientContract } from '../';
import { ImportError } from './types';

const REF_TYPES_TO_VLIDATE = ['index-pattern', 'search'];

function filterReferencesToValidate({ type }: { type: string }) {
  return REF_TYPES_TO_VLIDATE.includes(type);
}

export async function getNonExistingReferenceAsKeys(
  savedObjects: SavedObject[],
  savedObjectsClient: SavedObjectsClientContract
) {
  const collector = new Map();
  // Collect all references within objects
  for (const savedObject of savedObjects) {
    const filteredReferences = (savedObject.references || []).filter(filterReferencesToValidate);
    for (const { type, id } of filteredReferences) {
      collector.set(`${type}:${id}`, { type, id });
    }
  }

  // Remove objects that could be references
  for (const savedObject of savedObjects) {
    collector.delete(`${savedObject.type}:${savedObject.id}`);
  }
  if (collector.size === 0) {
    return [];
  }

  // Fetch references to see if they exist
  const bulkGetOpts = Array.from(collector.values()).map(obj => ({ ...obj, fields: ['id'] }));
  const bulkGetResponse = await savedObjectsClient.bulkGet(bulkGetOpts);

  // Error handling
  const erroredObjects = bulkGetResponse.saved_objects.filter(
    obj => obj.error && obj.error.statusCode !== 404
  );
  if (erroredObjects.length) {
    const err = Boom.badRequest();
    err.output.payload.attributes = {
      objects: erroredObjects,
    };
    throw err;
  }

  // Cleanup collector
  for (const savedObject of bulkGetResponse.saved_objects) {
    if (savedObject.error) {
      continue;
    }
    collector.delete(`${savedObject.type}:${savedObject.id}`);
  }

  return [...collector.keys()];
}

export async function validateReferences(
  savedObjects: SavedObject[],
  savedObjectsClient: SavedObjectsClientContract
) {
  const errorMap: { [key: string]: ImportError } = {};
  const nonExistingReferenceKeys = await getNonExistingReferenceAsKeys(
    savedObjects,
    savedObjectsClient
  );

  // Filter out objects with missing references, add to error object
  let filteredObjects = savedObjects.filter(savedObject => {
    const missingReferences = [];
    const enforcedTypeReferences = (savedObject.references || []).filter(
      filterReferencesToValidate
    );
    for (const { type: refType, id: refId } of enforcedTypeReferences) {
      if (nonExistingReferenceKeys.includes(`${refType}:${refId}`)) {
        missingReferences.push({ type: refType, id: refId });
      }
    }
    if (missingReferences.length === 0) {
      return true;
    }
    errorMap[`${savedObject.type}:${savedObject.id}`] = {
      id: savedObject.id,
      type: savedObject.type,
      title: savedObject.attributes && savedObject.attributes.title,
      error: {
        type: 'missing_references',
        references: missingReferences,
        blocking: [],
      },
    };
    return false;
  });

  // Filter out objects that reference objects within the import but are missing_references
  // For example: visualization referencing a search that is missing an index pattern needs to be filtered out
  filteredObjects = filteredObjects.filter(savedObject => {
    let isBlocked = false;
    for (const reference of savedObject.references || []) {
      const referencedObjectError = errorMap[`${reference.type}:${reference.id}`];
      if (!referencedObjectError || referencedObjectError.error.type !== 'missing_references') {
        continue;
      }
      referencedObjectError.error.blocking.push({
        type: savedObject.type,
        id: savedObject.id,
      });
      isBlocked = true;
    }
    return !isBlocked;
  });

  return {
    errors: Object.values(errorMap),
    filteredObjects,
  };
}
