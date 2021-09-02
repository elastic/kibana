/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import { SavedObject } from '../../types';
import type { ObjectKeyProvider } from './get_object_key';

/**
 * Takes an array of saved objects and returns an importIdMap of randomly-generated new IDs.
 */
export const regenerateIds = ({
  objects,
  getObjKey,
}: {
  objects: SavedObject[];
  getObjKey: ObjectKeyProvider;
}) => {
  return objects.reduce((acc, object) => {
    return acc.set(getObjKey(object), {
      id: uuidv4(),
      omitOriginId: true,
    });
  }, new Map<string, { id: string; omitOriginId?: boolean }>());
};
