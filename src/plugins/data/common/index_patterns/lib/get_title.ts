/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsClientContract, SimpleSavedObject } from '../../../../../core/public';

export async function getTitle(
  client: SavedObjectsClientContract,
  indexPatternId: string
): Promise<SimpleSavedObject<any>> {
  const savedObject = (await client.get('index-pattern', indexPatternId)) as SimpleSavedObject<any>;

  if (savedObject.error) {
    throw new Error(`Unable to get index-pattern title: ${savedObject.error.message}`);
  }

  return savedObject.attributes.title;
}
