/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ISavedObjectsRepository,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsFindResult,
} from '@kbn/core/server';

export async function fetchAllSavedObjects<T>(
  soRepository: ISavedObjectsRepository,
  findOptions: SavedObjectsCreatePointInTimeFinderOptions
): Promise<Array<SavedObjectsFindResult<T>>> {
  const finder = soRepository.createPointInTimeFinder<T>({ ...findOptions, perPage: 1000 });

  const allSavedObjects: Array<SavedObjectsFindResult<T>> = [];

  for await (const { saved_objects: savedObjects } of finder.find()) {
    allSavedObjects.push(...savedObjects);
  }

  return allSavedObjects;
}
