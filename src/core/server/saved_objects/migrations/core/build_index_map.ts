/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsTypeMappingDefinitions } from '../../mappings';
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';

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
    if (!map.hasOwnProperty(indexPattern as string)) {
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
