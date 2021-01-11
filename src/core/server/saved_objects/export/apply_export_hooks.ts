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

import { SavedObject } from '../../../types';
import { KibanaRequest } from '../../http';
import { SavedObjectsTypeExportHook, SavedObjectsExportContext } from './types';

interface ApplyExportHooksOptions {
  objects: SavedObject[];
  request: KibanaRequest;
  exportHooks: Record<string, SavedObjectsTypeExportHook>;
}

// TODO: doc + add tests.
export const applyExportHooks = async ({
  objects,
  request,
  exportHooks,
}: ApplyExportHooksOptions): Promise<SavedObject[]> => {
  const context = createContext(request);
  const byType = splitByType(objects);

  let finalObjects: SavedObject[] = [];
  for (const [type, typeObjs] of Object.entries(byType)) {
    const typeHook = exportHooks[type];
    if (typeHook) {
      finalObjects = [...finalObjects, ...(await typeHook(typeObjs, context))];
    } else {
      finalObjects = [...finalObjects, ...typeObjs];
    }
  }

  return finalObjects;
};

const createContext = (request: KibanaRequest): SavedObjectsExportContext => {
  return {
    request,
  };
};

const splitByType = (objects: SavedObject[]): Record<string, SavedObject[]> => {
  return objects.reduce((memo, obj) => {
    memo[obj.type] = [...(memo[obj.type] ?? []), obj];
    return memo;
  }, {} as Record<string, SavedObject[]>);
};
