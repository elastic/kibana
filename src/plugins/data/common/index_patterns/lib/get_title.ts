/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract, SimpleSavedObject } from '../../../../../core/public';
import { INDEX_PATTERN_SAVED_OBJECT_TYPE } from '../../constants';

export async function getTitle(
  client: SavedObjectsClientContract,
  indexPatternId: string
): Promise<SimpleSavedObject<any>> {
  const savedObject = (await client.get(
    INDEX_PATTERN_SAVED_OBJECT_TYPE,
    indexPatternId
  )) as SimpleSavedObject<any>;

  if (savedObject.error) {
    throw new Error(`Unable to get index-pattern title: ${savedObject.error.message}`);
  }

  return savedObject.attributes.title;
}
