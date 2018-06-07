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
import _ from 'lodash';
import {
  CallCluster,
  IndexMapping,
  MappingDefinition,
  MigrationPlugin,
} from './types';

interface BuildMappingsOpts {
  kibanaVersion: string;
  plugins: MigrationPlugin[];
}

/**
 * Builds a single index mapping from a list of plugins.
 *
 * @param opts
 * @prop {string} kibanaVersion - The current version of Kibana
 * @prop {MigrationPlugin[]} plugins - The plugins whose mappings will be applied to the index
 * @returns {IndexMapping}
 */
export function buildMappings({
  kibanaVersion,
  plugins,
}: BuildMappingsOpts): IndexMapping {
  const mapping = defaultMapping();
  return {
    doc: {
      ...mapping.doc,
      _meta: { kibanaVersion },
      properties: plugins.reduce(validateAndMerge, mapping.doc.properties),
    },
  };
}

export async function putMapping(
  callCluster: CallCluster,
  index: string,
  mapping: IndexMapping
) {
  return callCluster('indices.putMapping', {
    body: mapping.doc,
    index,
    type: 'doc',
  });
}

export async function fetchMapping(
  callCluster: CallCluster,
  index: string
): Promise<IndexMapping> {
  const result = await callCluster('indices.getMapping', { index });
  return Object.values(result)[0].mappings || defaultMapping();
}

function defaultMapping(): IndexMapping {
  return _.cloneDeep({
    doc: {
      dynamic: 'strict',
      properties: {
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
      },
    },
  });
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
