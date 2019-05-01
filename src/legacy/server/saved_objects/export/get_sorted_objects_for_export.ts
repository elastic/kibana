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
import { SavedObjectsClient } from '../service/saved_objects_client';
import { injectNestedDependencies } from './inject_nested_depdendencies';
import { sortObjects } from './sort_objects';

interface ObjectToExport {
  id: string;
  type: string;
}

interface ExportObjectsOptions {
  types?: string[];
  objects?: ObjectToExport[];
  savedObjectsClient: SavedObjectsClient;
  exportSizeLimit: number;
  includeReferencesDeep?: boolean;
  supportedTypes: string[];
}

function throwIfInvalidTypes(
  action: string,
  objectTypes: string[],
  supportedTypes: string[],
  authorizedTypes: Array<{ type: string; can: boolean }>
) {
  const invalidTypes = new Set([
    ...objectTypes.filter(type => !supportedTypes.includes(type)),
    ...authorizedTypes.filter(resp => resp.can === false).map(resp => resp.type),
  ]);
  if (invalidTypes.size) {
    throw Boom.badRequest(
      `Unable to ${action} ${Array.from(invalidTypes)
        .sort()
        .join(',')}`
    );
  }
}

async function fetchObjectsToExport({
  objects,
  types,
  exportSizeLimit,
  savedObjectsClient,
  supportedTypes,
}: {
  objects?: ObjectToExport[];
  types?: string[];
  exportSizeLimit: number;
  savedObjectsClient: SavedObjectsClient;
  supportedTypes: string[];
}) {
  if (objects) {
    const objectTypes = [...new Set(objects.map(obj => obj.type))];
    throwIfInvalidTypes(
      'bulk_get',
      objectTypes,
      supportedTypes,
      await savedObjectsClient.canBulkGet(objects)
    );
    if (objects.length > exportSizeLimit) {
      throw Boom.badRequest(`Can't export more than ${exportSizeLimit} objects`);
    }
    const bulkGetResult = await savedObjectsClient.bulkGet(objects);
    const erroredObjects = bulkGetResult.saved_objects.filter(obj => !!obj.error);
    if (erroredObjects.length) {
      const err = Boom.badRequest();
      err.output.payload.attributes = {
        objects: erroredObjects,
      };
      throw err;
    }
    return bulkGetResult.saved_objects;
  }

  throwIfInvalidTypes(
    'find',
    types || [],
    supportedTypes,
    await savedObjectsClient.canFind({
      type: types,
      sortField: '_id',
      sortOrder: 'asc',
      perPage: exportSizeLimit,
    })
  );
  const findResponse = await savedObjectsClient.find({
    type: types,
    sortField: '_id',
    sortOrder: 'asc',
    perPage: exportSizeLimit,
  });
  if (findResponse.total > exportSizeLimit) {
    throw Boom.badRequest(`Can't export more than ${exportSizeLimit} objects`);
  }
  return findResponse.saved_objects;
}

export async function getSortedObjectsForExport({
  types,
  objects,
  savedObjectsClient,
  exportSizeLimit,
  includeReferencesDeep = false,
  supportedTypes,
}: ExportObjectsOptions) {
  const objectsToExport = await fetchObjectsToExport({
    types,
    objects,
    savedObjectsClient,
    exportSizeLimit,
    supportedTypes,
  });
  return sortObjects(
    includeReferencesDeep
      ? await injectNestedDependencies(objectsToExport, savedObjectsClient)
      : objectsToExport
  );
}
