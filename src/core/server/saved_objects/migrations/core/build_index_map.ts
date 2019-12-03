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

import { MappingProperties } from '../../mappings';
import { SavedObjectsSchema } from '../../schema';
import { LegacyConfig } from '../../../legacy/config';

export interface CreateIndexMapOptions {
  config: LegacyConfig;
  kibanaIndexName: string;
  schema: SavedObjectsSchema;
  indexMap: MappingProperties;
}

export interface IndexMap {
  [index: string]: {
    typeMappings: MappingProperties;
    script?: string;
  };
}

/*
 * This file contains logic to convert savedObjectSchemas into a dictonary of indexes and documents
 */
export function createIndexMap({
  /** @deprecated Remove once savedObjectsSchemas are exposed from Core */
  config,
  kibanaIndexName,
  schema,
  indexMap,
}: CreateIndexMapOptions) {
  const map: IndexMap = {};
  Object.keys(indexMap).forEach(type => {
    const script = schema.getConvertToAliasScript(type);
    // Defaults to kibanaIndexName if indexPattern isn't defined
    const indexPattern = schema.getIndexForType(config, type) || kibanaIndexName;
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
