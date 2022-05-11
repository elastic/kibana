/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsCreatePointInTimeFinderOptions,
} from '@kbn/core/server';

export const findAll = async (
  client: SavedObjectsClientContract,
  findOptions: SavedObjectsCreatePointInTimeFinderOptions
): Promise<SavedObject[]> => {
  const finder = client.createPointInTimeFinder(findOptions);
  const results: SavedObject[] = [];
  for await (const result of finder.find()) {
    results.push(...result.saved_objects);
  }
  return results;
};
