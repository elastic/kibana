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
import { SavedObjectMigrationMap } from './migrations';
import {
  SavedObjectsNamespaceType,
  SavedObjectsType,
  SavedObjectsLegacyUiExports,
  SavedObjectLegacyMigrationMap,
  SavedObjectsLegacyManagementTypeDefinition,
  SavedObjectsTypeManagementDefinition,
} from './types';
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
    savedObjectsManagement = {},
  }: SavedObjectsLegacyUiExports,
  legacyConfig: LegacyConfig
): SavedObjectsType[] => {
  return savedObjectMappings.reduce((types, { properties }) => {
    return [
      ...types,
      ...Object.entries(properties).map(([type, mappings]) => {
        const schema = savedObjectSchemas[type];
        const migrations = savedObjectMigrations[type];
        const management = savedObjectsManagement[type];
        const namespaceType = (schema?.isNamespaceAgnostic
          ? 'agnostic'
          : schema?.multiNamespace
          ? 'multiple'
          : 'single') as SavedObjectsNamespaceType;
        return {
          name: type,
          hidden: schema?.hidden ?? false,
          namespaceType,
          mappings,
          indexPattern:
            typeof schema?.indexPattern === 'function'
              ? schema.indexPattern(legacyConfig)
              : schema?.indexPattern,
          convertToAliasScript: schema?.convertToAliasScript,
          migrations: convertLegacyMigrations(migrations ?? {}),
          management: management ? convertLegacyTypeManagement(management) : undefined,
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
        isNamespaceAgnostic: type.namespaceType === 'agnostic',
        multiNamespace: type.namespaceType === 'multiple',
        hidden: type.hidden,
        indexPattern: type.indexPattern,
        convertToAliasScript: type.convertToAliasScript,
      },
    };
  }, {} as SavedObjectsSchemaDefinition);
};

const convertLegacyMigrations = (
  legacyMigrations: SavedObjectLegacyMigrationMap
): SavedObjectMigrationMap => {
  return Object.entries(legacyMigrations).reduce((migrated, [version, migrationFn]) => {
    return {
      ...migrated,
      [version]: (doc, context) => migrationFn(doc, context.log),
    };
  }, {} as SavedObjectMigrationMap);
};

const convertLegacyTypeManagement = (
  legacyTypeManagement: SavedObjectsLegacyManagementTypeDefinition
): SavedObjectsTypeManagementDefinition => {
  return {
    importableAndExportable: legacyTypeManagement.isImportableAndExportable,
    defaultSearchField: legacyTypeManagement.defaultSearchField,
    icon: legacyTypeManagement.icon,
    getTitle: legacyTypeManagement.getTitle,
    getEditUrl: legacyTypeManagement.getEditUrl,
    getInAppUrl: legacyTypeManagement.getInAppUrl,
  };
};
