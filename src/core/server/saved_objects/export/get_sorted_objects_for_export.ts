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
import { createListStream } from '../../../../legacy/utils/streams';
import { SavedObjectsClientContract } from '../types';
import { injectNestedDependencies } from './inject_nested_depdendencies';
import { sortObjects } from './sort_objects';

/**
 * Options controlling the export operation.
 * @public
 */
export interface SavedObjectsExportOptions {
  types?: string[];
  objects?: Array<{
    id: string;
    type: string;
  }>;
  savedObjectsClient: SavedObjectsClientContract;
  exportSizeLimit: number;
  includeReferencesDeep?: boolean;
  namespace?: string;
}

async function fetchObjectsToExport({
  objects,
  types,
  exportSizeLimit,
  savedObjectsClient,
  namespace,
}: {
  objects?: SavedObjectsExportOptions['objects'];
  types?: string[];
  exportSizeLimit: number;
  savedObjectsClient: SavedObjectsClientContract;
  namespace?: string;
}) {
  if (objects) {
    if (objects.length > exportSizeLimit) {
      throw Boom.badRequest(`Can't export more than ${exportSizeLimit} objects`);
    }
    const bulkGetResult = await savedObjectsClient.bulkGet(objects, { namespace });
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
  const findResponse = await savedObjectsClient.find({
    type: types,
    sortField: '_id',
    sortOrder: 'asc',
    perPage: exportSizeLimit,
    namespace,
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
  namespace,
}: SavedObjectsExportOptions) {
  const objectsToExport = await fetchObjectsToExport({
    types,
    objects,
    savedObjectsClient,
    exportSizeLimit,
    namespace,
  });

  const exportedObjects = sortObjects(
    includeReferencesDeep
      ? await injectNestedDependencies(objectsToExport, savedObjectsClient, namespace)
      : objectsToExport
  );

  return createListStream(exportedObjects);
}
