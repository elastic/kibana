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

import { SavedObject, SavedObjectsClient } from '../service';
import { ImportError, MissingReferencesError } from './types';

const ENFORCED_TYPES = ['index-pattern', 'search'];

export async function getNonExistingReferenceAsKeys(
  savedObjects: SavedObject[],
  savedObjectsClient: SavedObjectsClient
) {
  const collector = new Map();
  for (const savedObject of savedObjects) {
    for (const { type, id } of savedObject.references || []) {
      if (!ENFORCED_TYPES.includes(type)) {
        continue;
      }
      collector.set(`${type}:${id}`, { type, id });
    }
  }
  for (const savedObject of savedObjects) {
    collector.delete(`${savedObject.type}:${savedObject.id}`);
  }
  if (collector.size) {
    const bulkGetOpts = Array.from(collector.values()).map(obj => ({ ...obj, fields: ['id'] }));
    const bulkGetResponse = await savedObjectsClient.bulkGet(bulkGetOpts);
    for (const savedObject of bulkGetResponse.saved_objects) {
      if (savedObject.error) {
        continue;
      }
      collector.delete(`${savedObject.type}:${savedObject.id}`);
    }
  }
  return [...collector.keys()];
}

export async function validateReferences(
  savedObjects: SavedObject[],
  savedObjectsClient: SavedObjectsClient
) {
  const errorMap: { [key: string]: ImportError } = {};

  const nonExistingReferenceKeys = await getNonExistingReferenceAsKeys(
    savedObjects,
    savedObjectsClient
  );

  // Filter out objects with missing references, add to error object
  let filteredObjects = savedObjects.filter(savedObject => {
    const missingReferences = [];
    for (const { type: refType, id: refId } of savedObject.references || []) {
      if (!ENFORCED_TYPES.includes(refType)) {
        continue;
      }
      if (nonExistingReferenceKeys.includes(`${refType}:${refId}`)) {
        missingReferences.push({ type: refType, id: refId });
      }
    }
    if (missingReferences.length) {
      errorMap[`${savedObject.type}:${savedObject.id}`] = {
        id: savedObject.id,
        type: savedObject.type,
        title: savedObject.attributes.title,
        error: {
          type: 'missing_references',
          references: missingReferences,
        },
      };
    }
    return missingReferences.length === 0;
  });

  // Filter out objects that reference objects within the import but are missing_references
  // For example: visualization referencing a search that is missing an index pattern needs to be filtered out
  filteredObjects = filteredObjects.filter(savedObject => {
    const referenceErrors = [];
    for (const { type: refType, id: refId } of savedObject.references || []) {
      if (!errorMap[`${refType}:${refId}`]) {
        continue;
      }
      if (errorMap[`${refType}:${refId}`].error.type === 'missing_references') {
        const error = errorMap[`${refType}:${refId}`].error as MissingReferencesError;
        referenceErrors.push(...error.references);
      }
    }
    if (referenceErrors.length) {
      errorMap[`${savedObject.type}:${savedObject.id}`] = {
        id: savedObject.id,
        type: savedObject.type,
        title: savedObject.attributes.title,
        error: {
          type: 'references_missing_references',
          references: referenceErrors,
        },
      };
    }
    return referenceErrors.length === 0;
  });

  return {
    errors: Object.values(errorMap),
    filteredObjects,
  };
}
