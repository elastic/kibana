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

import { SavedObject } from '../../types';
import { SavedObjectsImportHook, SavedObjectsImportWarning } from '../types';

interface ExecuteImportHooksOptions {
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
