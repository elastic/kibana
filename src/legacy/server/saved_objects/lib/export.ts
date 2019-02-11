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

interface ExportDocumentOptions {
  type?: string | string[];
  objects?: ObjectToExport[];
  savedObjectsClient: SavedObjectsClient;
  exportSizeLimit: number;
}

export async function getExportDocuments({
  type,
  objects,
  savedObjectsClient,
  exportSizeLimit,
}: ExportDocumentOptions) {
  let docsToExport: SavedObject[] = [];
  if (objects) {
    if (objects.length > exportSizeLimit) {
      throw Boom.badRequest(`Can't export more than ${exportSizeLimit} objects`);
    }
    ({ saved_objects: docsToExport } = await savedObjectsClient.bulkGet(objects));
  } else if (type) {
    const findResponse = await savedObjectsClient.find({
      type,
      perPage: exportSizeLimit,
    });
    if (findResponse.total > exportSizeLimit) {
      throw Boom.badRequest(`Can't export more than ${exportSizeLimit} objects`);
    }
    ({ saved_objects: docsToExport } = findResponse);
  }
  docsToExport = sortDocs(docsToExport);
  return docsToExport;
}

export function sortDocs(docs: SavedObject[]) {
  const array = [...docs];
  let moveCounts = 0; // Used for detecting infinite loops
  for (let i = 0; i < array.length; i++) {
    const doc = array[i];
    const references = doc.references || [];
    let hasMovedDocs = false;
    for (const reference of references) {
      const referenceIndex = array.findIndex(
        item => item.type === reference.type && item.id === reference.id
      );
      if (referenceIndex > i) {
        const referenceDoc = array[referenceIndex];
        array.splice(referenceIndex, 1);
        array.splice(i, 0, referenceDoc);
        moveCounts++;
        hasMovedDocs = true;
      }
    }
    if (hasMovedDocs) {
      // Lets scan the docs that got moved ahead at current index
      i--;
    }
    if (moveCounts > array.length) {
      // We'll consider it a circular dependencies when all the items had to move up in the array
      throw Boom.badRequest('Circular dependency');
    }
  }
  return array;
}
