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
import { SavedObjectsClientContract, SavedObject } from '../types';
import { fetchNestedDependencies } from './inject_nested_depdendencies';
import { sortObjects } from './sort_objects';

/**
 * Options controlling the export operation.
 * @public
 */
export interface SavedObjectsExportOptions {
  /** optional array of saved object types. */
  types?: string[];
  /** optional array of objects to export. */
  objects?: Array<{
    /** the saved object id. */
    id: string;
    /** the saved object type. */
    type: string;
  }>;
  /** optional query string to filter exported objects. */
  search?: string;
  /** an instance of the SavedObjectsClient. */
  savedObjectsClient: SavedObjectsClientContract;
  /** the maximum number of objects to export. */
  exportSizeLimit: number;
  /** flag to also include all related saved objects in the export stream. */
  includeReferencesDeep?: boolean;
  /** flag to not append {@link SavedObjectsExportResultDetails | export details} to the end of the export stream. */
  excludeExportDetails?: boolean;
  /** optional namespace to override the namespace used by the savedObjectsClient. */
  namespace?: string;
}

/**
 * Structure of the export result details entry
 * @public
 */
export interface SavedObjectsExportResultDetails {
  /** number of successfully exported objects */
  exportedCount: number;
  /** number of missing references */
  missingRefCount: number;
  /** missing references details */
  missingReferences: Array<{
    /** the missing reference id. */
    id: string;
    /** the missing reference type. */
    type: string;
  }>;
}

async function fetchObjectsToExport({
  objects,
  types,
  search,
  exportSizeLimit,
  savedObjectsClient,
  namespace,
}: {
  objects?: SavedObjectsExportOptions['objects'];
  types?: string[];
  search?: string;
  exportSizeLimit: number;
  savedObjectsClient: SavedObjectsClientContract;
  namespace?: string;
}) {
  if ((types?.length ?? 0) > 0 && (objects?.length ?? 0) > 0) {
    throw Boom.badRequest(`Can't specify both "types" and "objects" properties when exporting`);
  }
  if (objects && objects.length > 0) {
    if (objects.length > exportSizeLimit) {
      throw Boom.badRequest(`Can't export more than ${exportSizeLimit} objects`);
    }
    if (typeof search === 'string') {
      throw Boom.badRequest(`Can't specify both "search" and "objects" properties when exporting`);
    }
    const bulkGetResult = await savedObjectsClient.bulkGet(objects, { namespace });
    const erroredObjects = bulkGetResult.saved_objects.filter((obj) => !!obj.error);
    if (erroredObjects.length) {
      const err = Boom.badRequest();
      err.output.payload.attributes = {
        objects: erroredObjects,
      };
      throw err;
    }
    return bulkGetResult.saved_objects;
  } else if (types && types.length > 0) {
    const findResponse = await savedObjectsClient.find({
      type: types,
      search,
      perPage: exportSizeLimit,
      namespaces: namespace ? [namespace] : undefined,
    });
    if (findResponse.total > exportSizeLimit) {
      throw Boom.badRequest(`Can't export more than ${exportSizeLimit} objects`);
    }

    // sorts server-side by _id, since it's only available in fielddata
    return (
      findResponse.saved_objects
        // exclude the find-specific `score` property from the exported objects
        .map(({ score, ...obj }) => obj)
        .sort((a: SavedObject, b: SavedObject) => (a.id > b.id ? 1 : -1))
    );
  } else {
    throw Boom.badRequest('Either `type` or `objects` are required.');
  }
}

/**
 * Generates sorted saved object stream to be used for export.
 * See the {@link SavedObjectsExportOptions | options} for more detailed information.
 *
 * @public
 */
export async function exportSavedObjectsToStream({
  types,
  objects,
  search,
  savedObjectsClient,
  exportSizeLimit,
  includeReferencesDeep = false,
  excludeExportDetails = false,
  namespace,
}: SavedObjectsExportOptions) {
  const rootObjects = await fetchObjectsToExport({
    types,
    objects,
    search,
    savedObjectsClient,
    exportSizeLimit,
    namespace,
  });
  let exportedObjects = [];
  let missingReferences: SavedObjectsExportResultDetails['missingReferences'] = [];

  if (includeReferencesDeep) {
    const fetchResult = await fetchNestedDependencies(rootObjects, savedObjectsClient, namespace);
    exportedObjects = sortObjects(fetchResult.objects);
    missingReferences = fetchResult.missingRefs;
  } else {
    exportedObjects = sortObjects(rootObjects);
  }

  // redact attributes that should not be exported
  const redactedObjects = exportedObjects.map<SavedObject<unknown>>(
    ({ namespaces, ...object }) => object
  );

  const exportDetails: SavedObjectsExportResultDetails = {
    exportedCount: exportedObjects.length,
    missingRefCount: missingReferences.length,
    missingReferences,
  };
  return createListStream([...redactedObjects, ...(excludeExportDetails ? [] : [exportDetails])]);
}
