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
import { buildActiveMappings } from './build_active_mappings';
import { fetchMapping } from './fetch_mapping';
import {
  CallCluster,
  IndexMapping,
  MappingDefinition,
  MigrationPlugin,
} from './types';

export interface InitializeOpts {
  callCluster: CallCluster;
  index: string;
  plugins: MigrationPlugin[];
}

interface InitializeContext extends InitializeOpts {
  activeMappings: IndexMapping;
  fullMappings: IndexMapping;
}

interface MigrationMappings {
  activeMappings: IndexMapping;
  fullMappings: IndexMapping;
}

/**
 * Updates the mappings and template for the specified index.
 *
 * @param opts
 * @prop {CallCluster} callCluster - The Elasticsearch connection to be used
 * @prop {string} index - The name of the index or alias being managed
 * @prop {MigrationPlugin[]} plugins - A list of plugins whose mappings will be applied to the index
 */
export async function patchIndexMappings(opts: InitializeOpts) {
  const context = await getContext(opts);

  await putTemplate(context);
  if (await indexExists(context)) {
    await putMappings(context);
  }
}

async function getContext(opts: InitializeOpts): Promise<InitializeContext> {
  const { activeMappings, fullMappings } = await loadFullMappings(opts);

  return {
    ...opts,
    activeMappings,
    fullMappings,
  };
}

function putTemplate({ callCluster, index, fullMappings }: InitializeContext) {
  return callCluster('indices.putTemplate', {
    body: {
      mappings: fullMappings,
      settings: {
        auto_expand_replicas: '0-1',
        number_of_shards: 1,
      },
      template: index,
    },
    name: `kibana_index_template:${index}`,
  });
}

function putMappings({ callCluster, index, fullMappings }: InitializeContext) {
  return callCluster('indices.putMapping', {
    body: fullMappings.doc,
    index,
    type: 'doc',
  });
}

function indexExists({ callCluster, index }: InitializeContext) {
  return callCluster('indices.exists', { index });
}

async function loadFullMappings(
  opts: InitializeOpts
): Promise<MigrationMappings> {
  const { callCluster, index } = opts;
  const activeMappings = buildActiveMappings(opts);
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

    // Dynamic documents are going to possibly have mismatched mappings, and that's OK,
    // as is moving from dynamic: strict to removing the dynamic property, as our doc is strict
    if (
      parseBool(_.get(indexValue, 'dynamic')) ||
      removingDynamic(indexValue, kibanaValue)
    ) {
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

function removingDynamic(indexValue: any, kibanaValue: any) {
  return (
    _.get(indexValue, 'dynamic') === 'strict' && !_.has(kibanaValue, 'dynamic')
  );
}

function parseBool(value: string | boolean | undefined) {
  return value === true || value === 'true';
}
