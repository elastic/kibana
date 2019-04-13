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

import { Readable } from 'stream';
import { SavedObjectsClient } from '../service';
import { collectSavedObjects } from './collect_saved_objects';
import { createObjectsFilter } from './create_objects_filter';
import { extractErrors } from './extract_errors';
import { splitOverwrites } from './split_overwrites';
import { ImportError, Retry } from './types';
import { validateReferences } from './validate_references';

interface ResolveImportErrorsOptions {
  readStream: Readable;
  objectLimit: number;
  savedObjectsClient: SavedObjectsClient;
  retries: Retry[];
  supportedTypes: string[];
}

interface ImportResponse {
  success: boolean;
  successCount: number;
  errors?: ImportError[];
}

export async function resolveImportErrors({
  readStream,
  objectLimit,
  retries,
  savedObjectsClient,
  supportedTypes,
}: ResolveImportErrorsOptions): Promise<ImportResponse> {
  let successCount = 0;
  let errorAccumulator: ImportError[] = [];
  const filter = createObjectsFilter(retries);

  // Get the objects to resolve errors
  const { errors: collectorErrors, collectedObjects: objectsToResolve } = await collectSavedObjects(
    {
      readStream,
      objectLimit,
      filter,
      supportedTypes,
    }
  );
  errorAccumulator = [...errorAccumulator, ...collectorErrors];

  // Create a map of references to replace for each object to avoid iterating through
  // retries for every object to resolve
  const retriesReferencesMap = new Map<string, { [key: string]: string }>();
  for (const retry of retries) {
    const map: { [key: string]: string } = {};
    for (const { type, from, to } of retry.replaceReferences) {
      map[`${type}:${from}`] = to;
    }
    retriesReferencesMap.set(`${retry.type}:${retry.id}`, map);
  }

  // Replace references
  for (const savedObject of objectsToResolve) {
    const refMap = retriesReferencesMap.get(`${savedObject.type}:${savedObject.id}`);
    if (!refMap) {
      continue;
    }
    for (const reference of savedObject.references || []) {
      if (refMap[`${reference.type}:${reference.id}`]) {
        reference.id = refMap[`${reference.type}:${reference.id}`];
      }
    }
  }

  // Validate references
  const { filteredObjects, errors: validationErrors } = await validateReferences(
    objectsToResolve,
    savedObjectsClient
  );
  errorAccumulator = [...errorAccumulator, ...validationErrors];

  // Bulk create in two batches, overwrites and non-overwrites
  const { objectsToOverwrite, objectsToNotOverwrite } = splitOverwrites(filteredObjects, retries);
  if (objectsToOverwrite.length) {
    const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToOverwrite, {
      overwrite: true,
    });
    errorAccumulator = [
      ...errorAccumulator,
      ...extractErrors(bulkCreateResult.saved_objects, objectsToOverwrite),
    ];
    successCount += bulkCreateResult.saved_objects.filter(obj => !obj.error).length;
  }
  if (objectsToNotOverwrite.length) {
    const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToNotOverwrite);
    errorAccumulator = [
      ...errorAccumulator,
      ...extractErrors(bulkCreateResult.saved_objects, objectsToNotOverwrite),
    ];
    successCount += bulkCreateResult.saved_objects.filter(obj => !obj.error).length;
  }

  return {
    successCount,
    success: errorAccumulator.length === 0,
    ...(errorAccumulator.length ? { errors: errorAccumulator } : {}),
  };
}
