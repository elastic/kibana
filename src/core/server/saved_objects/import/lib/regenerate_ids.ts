/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import { SavedObject } from '../../types';
import type { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { getObjKey } from '../../service/lib';

/**
 * Takes an array of saved objects and returns an importIdMap of randomly-generated new IDs.
 *
 * @param objects The saved objects to generate new IDs for.
 */
export const regenerateIds = ({
  objects,
  typeRegistry,
  namespace,
}: {
  objects: SavedObject[];
  typeRegistry: ISavedObjectTypeRegistry;
  namespace?: string;
}) => {
  const importIdMap = objects.reduce((acc, object) => {
    return acc.set(getObjKey(object, typeRegistry, namespace), {
      id: uuidv4(),
      omitOriginId: true,
    });
  }, new Map<string, { id: string; omitOriginId?: boolean }>());
  return importIdMap;
};
