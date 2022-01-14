/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '../../types';
import { SavedObjectsImportHook, SavedObjectsImportWarning } from '../types';

export interface ExecuteImportHooksOptions {
  objects: SavedObject[];
  importHooks: Record<string, SavedObjectsImportHook[]>;
}

export const executeImportHooks = async ({
  objects,
  importHooks,
}: ExecuteImportHooksOptions): Promise<SavedObjectsImportWarning[]> => {
  const objsByType = splitByType(objects);
  let warnings: SavedObjectsImportWarning[] = [];

  for (const [type, typeObjs] of Object.entries(objsByType)) {
    const hooks = importHooks[type] ?? [];
    for (const hook of hooks) {
      const hookResult = await hook(typeObjs);
      if (hookResult.warnings) {
        warnings = [...warnings, ...hookResult.warnings];
      }
    }
  }

  return warnings;
};

const splitByType = (objects: SavedObject[]): Record<string, SavedObject[]> => {
  return objects.reduce((memo, obj) => {
    memo[obj.type] = [...(memo[obj.type] ?? []), obj];
    return memo;
  }, {} as Record<string, SavedObject[]>);
};
