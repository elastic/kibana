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

import _ from 'lodash';
import { fetchOrDefault } from './fetch_or_default';
import {
  CallCluster,
  IndexMapping,
  MappingDefinition,
  MigrationPlugin,
} from './types';

export interface GetFullMappingsOpts {
  callCluster: CallCluster;
  index: string;
  plugins: MigrationPlugin[];
}

export interface MigrationMappings {
  activeMappings: IndexMapping;
  fullMappings: IndexMapping;
}

export function getActiveMappings(plugins: MigrationPlugin[]): IndexMapping {
  const mapping = defaultMapping();
  return {
    doc: {
      ...mapping.doc,
      properties: plugins.reduce(validateAndMerge, mapping.doc.properties),
    },
  };
}

export async function loadMappings({
  plugins,
  callCluster,
  index,
}: GetFullMappingsOpts): Promise<MigrationMappings> {
  const activeMappings = getActiveMappings(plugins);
  const indexMappings = await fetchMapping(callCluster, index);
  if (indexMappings) {
    assertNonDestructiveChanges(
      indexMappings.doc.properties,
      activeMappings.doc.properties
    );
  }
  return {
    activeMappings,
    fullMappings: mergeMappings(
      _.get(indexMappings, 'doc.properties', {}),
      activeMappings
    ),
  };
}

export async function fetchMapping(
  callCluster: CallCluster,
  index: string
): Promise<IndexMapping | null> {
  const result = await fetchOrDefault(
    callCluster('indices.getMapping', { index }),
    null
  );
  if (!result) {
    return null;
  }
  return Object.values(result)[0].mappings || null;
}

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
  if (!mappings) {
    return definedMappings;
  }
  return Object.entries(mappings).reduce((acc, [type, definition]) => {
    assertUnique(id, acc, type);
    assertValidPTypeName(id, type);
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

function assertValidPTypeName(pluginId: string, propertyName: string) {
  if (propertyName.startsWith('_')) {
    throw new Error(
      `Invalid mapping "${propertyName}" in plugin "${pluginId}". Mappings cannot start with _.`
    );
  }
}

function mergeMappings(
  indexMappings: MappingDefinition,
  activeMappings: IndexMapping
): IndexMapping {
  return {
    doc: {
      ...activeMappings.doc,
      properties: {
        ...indexMappings,
        ...activeMappings.doc.properties,
      },
    },
  };
}

// Recursively compares the properties of the index's mappings
// with those which are active in the system / defined by active plugins.
function assertNonDestructiveChanges(
  indexProp: any,
  activeProp: any,
  prefix: string[] = []
) {
  const allKeys = _.keys(indexProp).concat(_.keys(activeProp));
  return _.uniq(allKeys).forEach(validateKey);

  function validateKey(key: string) {
    const propertyPath = [...prefix, key];
    const indexValue = indexProp[key];
    const kibanaValue = activeProp[key];

    // Dynamic documents are going to possibly have mismatched mappings, and that's OK
    if (parseBool(indexValue && indexValue.dynamic)) {
      return;
    }

    // If a prop is in the index, but not in any plugins, either:
    if (!activeProp.hasOwnProperty(key)) {
      // A. It's a root-level property, which most likely indicates a disabled plugin
      if (propertyPath.length === 1) {
        return;
      }
      // B. It's a nested property, which indicates a breaking change to the mappings
      throw new Error(
        `Invalid mapping change: deleted property "${propertyPath.join('.')}"`
      );
    }

    // If a prop is in the plugins, but not in the index, this is additive and is permissible
    if (!indexProp.hasOwnProperty(key)) {
      return;
    }

    // If the prop is in both and is an object, we need to do a deeper comparison
    if (_.isObject(indexValue) && _.isObject(kibanaValue)) {
      assertNonDestructiveChanges(indexValue, kibanaValue, propertyPath);
      return;
    }

    // If a prop is in both, but its type has changed, this is a breaking change (type change)
    if (indexValue !== kibanaValue) {
      throw new Error(
        `Invalid mapping change: property "${propertyPath.join(
          '.'
        )}" changed from "${indexValue}" to "${kibanaValue}"`
      );
    }
  }
}

function parseBool(value: string | boolean | undefined) {
  return value === true || value === 'true';
}
