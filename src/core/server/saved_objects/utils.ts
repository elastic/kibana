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

import { LegacyConfig } from '../legacy';
import { SavedObjectsType, SavedObjectsLegacyUiExports } from './types';
import { SavedObjectsSchemaDefinition } from './schema';

/**
 * Converts the legacy savedObjects mappings, schema, and migrations
 * to actual {@link SavedObjectsType | saved object types}
 */
export const convertLegacyTypes = (
  {
    savedObjectMappings = [],
    savedObjectMigrations = {},
    savedObjectSchemas = {},
  }: SavedObjectsLegacyUiExports,
  legacyConfig: LegacyConfig
): SavedObjectsType[] => {
  return savedObjectMappings.reduce((types, { pluginId, properties }) => {
    return [
      ...types,
      ...Object.entries(properties).map(([type, mappings]) => {
        const schema = savedObjectSchemas[type];
        const migrations = savedObjectMigrations[type];
        return {
          name: type,
          hidden: schema?.hidden ?? false,
          namespaceAgnostic: schema?.isNamespaceAgnostic ?? false,
          mappings,
          indexPattern:
            typeof schema?.indexPattern === 'function'
              ? schema.indexPattern(legacyConfig)
              : schema?.indexPattern,
          convertToAliasScript: schema?.convertToAliasScript,
          migrations: migrations ?? {},
        };
      }),
    ];
  }, [] as SavedObjectsType[]);
};

/**
 * Convert {@link SavedObjectsType | saved object types} to the legacy {@link SavedObjectsSchemaDefinition | schema} format
 */
export const convertTypesToLegacySchema = (
  types: SavedObjectsType[]
): SavedObjectsSchemaDefinition => {
  return types.reduce((schema, type) => {
    return {
      ...schema,
      [type.name]: {
        isNamespaceAgnostic: type.namespaceAgnostic,
        hidden: type.hidden,
        indexPattern: type.indexPattern,
        convertToAliasScript: type.convertToAliasScript,
      },
    };
  }, {} as SavedObjectsSchemaDefinition);
};
