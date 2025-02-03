/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';

export interface CreateIndexMapOptions {
  kibanaIndexName: string;
  registry: ISavedObjectTypeRegistry;
  indexMap: SavedObjectsTypeMappingDefinitions;
}

export interface IndexMap {
  [index: string]: {
    typeMappings: SavedObjectsTypeMappingDefinitions;
    script?: string;
  };
}

/*
 * This file contains logic to convert savedObjectSchemas into a dictionary of indexes and documents
 */
export function createIndexMap({ kibanaIndexName, registry, indexMap }: CreateIndexMapOptions) {
  const map: IndexMap = {};
  Object.keys(indexMap).forEach((type) => {
    const typeDef = registry.getType(type);
    const script = typeDef?.convertToAliasScript;
    // Defaults to kibanaIndexName if indexPattern isn't defined
    const indexPattern = typeDef?.indexPattern || kibanaIndexName;
    if (!Object.hasOwn(map, indexPattern as string)) {
      map[indexPattern] = { typeMappings: {} };
    }
    map[indexPattern].typeMappings[type] = indexMap[type];
    if (script && map[indexPattern].script) {
      throw Error(
        `convertToAliasScript has been defined more than once for index pattern "${indexPattern}"`
      );
    } else if (script) {
      map[indexPattern].script = script;
    }
  });
  return map;
}
