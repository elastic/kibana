/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { getObjKey } from '../../service/lib';

type Entries = Array<{ type: string; id: string; namespaces?: string[] }>;

export const getNonUniqueEntries = (
  objects: Entries,
  typeRegistry: ISavedObjectTypeRegistry,
  namespace?: string
) => {
  const idCountMap = objects.reduce((acc, obj) => {
    const key = getObjKey(obj, typeRegistry, namespace);
    const val = acc.get(key) ?? 0;
    return acc.set(key, val + 1);
  }, new Map<string, number>());
  const nonUniqueEntries: string[] = [];
  idCountMap.forEach((value, key) => {
    if (value >= 2) {
      nonUniqueEntries.push(key);
    }
  });
  return nonUniqueEntries;
};
