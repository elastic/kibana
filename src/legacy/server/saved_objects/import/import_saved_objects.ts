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
import { ensureReferencesExist } from './ensure_references_exist';
import { extractErrors } from './extract_errors';
import { ImportError } from './types';

interface ImportSavedObjectsOptions {
  readStream: Readable;
  objectLimit: number;
  overwrite: boolean;
  savedObjectsClient: SavedObjectsClient;
}

interface ImportResponse {
  success: boolean;
  successCount: number;
  errors?: ImportError[];
}

export async function importSavedObjects({
  readStream,
  objectLimit,
  overwrite,
  savedObjectsClient,
}: ImportSavedObjectsOptions): Promise<ImportResponse> {
  let objectsToImport = await collectSavedObjects(readStream, objectLimit);

  let errors: ImportError[] = [];
  ({ filteredObjects: objectsToImport, errors } = await ensureReferencesExist(
    objectsToImport,
    savedObjectsClient
  ));

  if (objectsToImport.length === 0) {
    return {
      success: errors.length === 0,
      successCount: 0,
      ...(errors.length ? { errors } : {}),
    };
  }

  const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToImport, {
    overwrite,
  });
  errors = [...errors, ...extractErrors(bulkCreateResult.saved_objects)];

  return {
    success: errors.length === 0,
    successCount: objectsToImport.length - errors.length,
    ...(errors.length ? { errors } : {}),
  };
}
