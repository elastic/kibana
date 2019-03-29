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
}: ResolveImportErrorsOptions): Promise<ImportResponse> {
  let errors: ImportError[] = [];
  const filter = createObjectsFilter(retries);
  const objectsToResolve = await collectSavedObjects(readStream, objectLimit, filter);

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
      // Replace with refMap if defined
      if (refMap[`${reference.type}:${reference.id}`]) {
        reference.id = refMap[`${reference.type}:${reference.id}`];
      }
    }
  }

  // Validate the references
  const { filteredObjects, errors: validationErrors } = await validateReferences(
    objectsToResolve,
    savedObjectsClient
  );
  errors = errors.concat(validationErrors);

  const { objectsToOverwrite, objectsToNotOverwrite } = splitOverwrites(filteredObjects, retries);

  if (objectsToOverwrite.length) {
    const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToOverwrite, {
      overwrite: true,
    });
    errors = errors.concat(extractErrors(bulkCreateResult.saved_objects));
  }

  if (objectsToNotOverwrite.length) {
    const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToNotOverwrite);
    errors = errors.concat(extractErrors(bulkCreateResult.saved_objects));
  }

  return {
    success: errors.length === 0,
    successCount: objectsToResolve.length - errors.length,
    ...(errors.length ? { errors } : {}),
  };
}
