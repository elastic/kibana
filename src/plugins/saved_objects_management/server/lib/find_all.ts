/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsClientContract, SavedObject, SavedObjectsFindOptions } from 'src/core/server';

export const findAll = async (
  client: SavedObjectsClientContract,
  findOptions: SavedObjectsFindOptions
): Promise<SavedObject[]> => {
  return recursiveFind(client, findOptions, 1, []);
};

const recursiveFind = async (
  client: SavedObjectsClientContract,
  findOptions: SavedObjectsFindOptions,
  page: number,
  allObjects: SavedObject[]
): Promise<SavedObject[]> => {
  const objects = await client.find({
    ...findOptions,
    page,
  });

  allObjects.push(...objects.saved_objects);
  if (allObjects.length < objects.total) {
    return recursiveFind(client, findOptions, page + 1, allObjects);
  }

  return allObjects;
};
