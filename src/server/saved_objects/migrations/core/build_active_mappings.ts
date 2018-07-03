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

/*
 * This file contains logic to extract the index mapping information from a list of plugins.
*/

import _ from 'lodash';
import { IndexMapping, MappingDefinition, MigrationPlugin } from './types';

/**
 * getActiveMappings merges all of the mappings defined by the specified plugins
 * and returns an index mapping.
 *
 * @param {GetActiveMappingsOpts} opts
 * @prop {MigrationPlugin[]} plugins - An array of plugins whose mappings are used
 *    to build the result.
 * @returns {IndexMapping}
 */
export function buildActiveMappings({
  plugins,
}: {
  plugins: MigrationPlugin[];
}): IndexMapping {
  const mapping = defaultMapping();
  return {
    doc: {
      ...mapping.doc,
      properties: plugins.reduce(validateAndMerge, mapping.doc.properties),
    },
  };
}

// These mappings are required for any saved object index.
function defaultMapping(): IndexMapping {
  return _.cloneDeep({
    doc: {
      dynamic: 'strict',
      properties: {
        config: {
          dynamic: 'true',
          properties: {
            buildNum: {
              type: 'keyword',
            },
          },
        },
        migrationVersion: {
          type: 'object',
        },
        type: {
          type: 'keyword',
        },
        updated_at: {
          type: 'date',
        },
      },
    },
  });
}

// Merges a plugin's mappings into a dictionary of mappings, failing if a mapping is
// being redefined or if a mapping has an invalid type.
function validateAndMerge(
  definedMappings: MappingDefinition,
  { id, mappings }: MigrationPlugin
) {
  if (!mappings) {
    return definedMappings;
  }

  return Object.entries(mappings).reduce((acc, [type, definition]) => {
    assertUnique(id, acc, type);
    assertValidPropertyTypeName(id, type);
    return _.set(acc, type, definition);
  }, definedMappings);
}

function assertUnique(
  pluginId: string,
  mappings: MappingDefinition,
  propertyName: string
) {
  if (mappings.hasOwnProperty(propertyName)) {
    throw new Error(
      `Plugin "${pluginId}" is attempting to redefine mapping "${propertyName}".`
    );
  }
}

function assertValidPropertyTypeName(pluginId: string, propertyName: string) {
  if (propertyName.startsWith('_')) {
    throw new Error(
      `Invalid mapping "${propertyName}" in plugin "${pluginId}". Mappings cannot start with _.`
    );
  }
}
