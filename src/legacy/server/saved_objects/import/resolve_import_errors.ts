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
import { ImportError } from './types';

interface ResolveImportErrorsOptions {
  readStream: Readable;
  objectLimit: number;
  savedObjectsClient: SavedObjectsClient;
  overwrites: Array<{
    type: string;
    id: string;
  }>;
  replaceReferences: Array<{
    type: string;
    from: string;
    to: string;
  }>;
  skips: Array<{
    type: string;
    id: string;
  }>;
}

interface ImportResponse {
  success: boolean;
  successCount: number;
  errors?: ImportError[];
}

export async function resolveImportErrors({
  readStream,
  objectLimit,
  skips,
  overwrites,
  savedObjectsClient,
  replaceReferences,
}: ResolveImportErrorsOptions): Promise<ImportResponse> {
  let errors: ImportError[] = [];
  const filter = createObjectsFilter(skips, overwrites, replaceReferences);
  const objectsToResolve = await collectSavedObjects(readStream, objectLimit, filter);

  // Replace references
  const refReplacementsMap: Record<string, string> = {};
  for (const { type, to, from } of replaceReferences) {
    refReplacementsMap[`${type}:${from}`] = to;
  }
  for (const savedObject of objectsToResolve) {
    for (const reference of savedObject.references || []) {
      if (refReplacementsMap[`${reference.type}:${reference.id}`]) {
        reference.id = refReplacementsMap[`${reference.type}:${reference.id}`];
      }
    }
  }

  if (objectsToResolve.length) {
    const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToResolve, {
      overwrite: true,
    });
    errors = extractErrors(bulkCreateResult.saved_objects);
  }

  return {
    success: errors.length === 0,
    successCount: objectsToResolve.length - errors.length,
    ...(errors.length ? { errors } : {}),
  };
}
