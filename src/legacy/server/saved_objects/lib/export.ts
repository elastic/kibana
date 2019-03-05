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
import { SavedObject, SavedObjectsClient } from '../service/saved_objects_client';

interface ObjectToExport {
  id: string;
  type: string;
}

interface ExportObjectsOptions {
  types?: string[];
  objects?: ObjectToExport[];
  savedObjectsClient: SavedObjectsClient;
  exportSizeLimit: number;
}

export async function getSortedObjectsForExport({
  types,
  objects,
  savedObjectsClient,
  exportSizeLimit,
}: ExportObjectsOptions) {
  let objectsToExport: SavedObject[] = [];
  if (objects) {
    if (objects.length > exportSizeLimit) {
      throw Boom.badRequest(`Can't export more than ${exportSizeLimit} objects`);
    }
    ({ saved_objects: objectsToExport } = await savedObjectsClient.bulkGet(objects));
    const erroredObjects = objectsToExport.filter(obj => !!obj.error);
    if (erroredObjects.length) {
      const err = Boom.badRequest();
      err.output.payload.attributes = {
        objects: erroredObjects,
      };
      throw err;
    }
  } else {
    const findResponse = await savedObjectsClient.find({
      type: types,
      sortField: '_id',
      sortOrder: 'asc',
      perPage: exportSizeLimit,
    });
    if (findResponse.total > exportSizeLimit) {
      throw Boom.badRequest(`Can't export more than ${exportSizeLimit} objects`);
    }
    ({ saved_objects: objectsToExport } = findResponse);
  }
  return sortObjects(objectsToExport);
}

export function sortObjects(savedObjects: SavedObject[]) {
  const path = new Set();
  const sorted = new Set();
  const objectsByTypeId = new Map(
    savedObjects.map(object => [`${object.type}:${object.id}`, object] as [string, SavedObject])
  );

  function includeObjects(objects: SavedObject[]) {
    for (const object of objects) {
      if (path.has(object)) {
        throw Boom.badRequest(
          `circular reference: ${[...path, object]
            .map(obj => `[${obj.type}:${obj.id}]`)
            .join(' ref-> ')}`
        );
      }

      const refdObjects = object.references
        .map(ref => objectsByTypeId.get(`${ref.type}:${ref.id}`))
        .filter((ref): ref is SavedObject => !!ref);

      if (refdObjects.length) {
        path.add(object);
        includeObjects(refdObjects);
        path.delete(object);
      }

      sorted.add(object);
    }
  }

  includeObjects(savedObjects);
  return [...sorted];
}
