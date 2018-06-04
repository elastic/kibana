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

// Functions for building, comparing, and processing mapping definitions
// in saved object indices.
import { IndexMapping, MappingDefinition, MigrationPlugin } from './types';

const coreMappings = {
  config: {
    dynamic: true,
    properties: {
      buildNum: {
        type: 'keyword',
      },
    },
  },
  type: {
    type: 'keyword',
  },
  updated_at: {
    type: 'date',
  },
};

// Builds the mappigns for an index from a list of plugins, ensuring that a given
// property is defined only once.
export function buildMappings(plugins: MigrationPlugin[]): IndexMapping {
  return {
    doc: {
      dynamic: 'strict',
      properties: plugins.reduce(validateAndMerge, { ...coreMappings }),
    },
  };
}

function validateAndMerge(
  definedMappings: MappingDefinition,
  { id, mappings }: MigrationPlugin
) {
  if (mappings) {
    Object.keys(mappings).forEach(k => {
      assertUnique(id, definedMappings, k);
      assertValidPropertyName(id, k);
      definedMappings[k] = mappings[k];
    });
  }
  return definedMappings;
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

function assertValidPropertyName(pluginId: string, propertyName: string) {
  if (propertyName.startsWith('_')) {
    throw new Error(
      `Invalid mapping "${propertyName}" in plugin "${pluginId}". Mappings cannot start with _.`
    );
  }
}
