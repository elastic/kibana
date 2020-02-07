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

import { collectSavedObjects } from './collect_saved_objects';
import { extractErrors } from './extract_errors';
import {
  SavedObjectsImportError,
  SavedObjectsImportResponse,
  SavedObjectsImportOptions,
} from './types';
import { validateReferences } from './validate_references';

export async function importSavedObjects({
  readStream,
  objectLimit,
  overwrite,
  savedObjectsClient,
  supportedTypes,
  namespace,
}: SavedObjectsImportOptions): Promise<SavedObjectsImportResponse> {
  let errorAccumulator: SavedObjectsImportError[] = [];

  // Get the objects to import
  const {
    errors: collectorErrors,
    collectedObjects: objectsFromStream,
  } = await collectSavedObjects({ readStream, objectLimit, supportedTypes });
  errorAccumulator = [...errorAccumulator, ...collectorErrors];

  // Validate references
  const { filteredObjects, errors: validationErrors } = await validateReferences(
    objectsFromStream,
    savedObjectsClient,
    namespace
  );
  errorAccumulator = [...errorAccumulator, ...validationErrors];

  // Exit early if no objects to import
  if (filteredObjects.length === 0) {
    return {
      success: errorAccumulator.length === 0,
      successCount: 0,
      ...(errorAccumulator.length ? { errors: errorAccumulator } : {}),
    };
  }

  // Create objects in bulk
  const bulkCreateResult = await savedObjectsClient.bulkCreate(filteredObjects, {
    overwrite,
    namespace,
  });
  errorAccumulator = [
    ...errorAccumulator,
    ...extractErrors(bulkCreateResult.saved_objects, filteredObjects),
  ];

  return {
    success: errorAccumulator.length === 0,
    successCount: bulkCreateResult.saved_objects.filter(obj => !obj.error).length,
    ...(errorAccumulator.length ? { errors: errorAccumulator } : {}),
  };
}
