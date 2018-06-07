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
import { buildMappings, fetchMapping } from './mapping';
import { migrationType } from './migration_type';
import {
  CallCluster,
  IndexMapping,
  LogFunction,
  MappingDefinition,
  MigrationPlugin,
} from './types';
import { fetchOrDefault } from './util';

export interface MigratorOpts {
  callCluster: CallCluster;
  index: string;
  kibanaVersion: string;
  log: LogFunction;
  plugins: MigrationPlugin[];
}

interface MigrationContext extends MigratorOpts {
  indexMappings: IndexMapping | null;
  activeMappings: IndexMapping;
  fullMappings: IndexMapping;
  indexVersion: string;
}

/**
 * Creates an object that can be used to manage a saved object client index.
 *
 * @param opts
 * @prop {CallCluster} callCluster - The Elasticsearch connection to be used
 * @prop {string} index - The name of the index or alias being managed
 * @prop {string} kibanaVersion - The current version of Kibana
 * @prop {LogFunction} log - A function which writes out to logs `log(['debug', 'migration'], 'Hello world!')`
 * @prop {MigrationPlugin[]} plugins - A list of plugins whose mappings and transforms will be applied to the index
 */
export async function createMigrator(opts: MigratorOpts) {
  const context = await migrationContext(opts);

  return {
    /**
     * Gets the mappings that the index is expected to have.
     */
    getMappings: () => context.fullMappings,

    /**
     * Patches the index template and mappings, if the index is out of date.
     */
    patchIndex: () => patchIndex(context),

    /**
     * Updates the index to have the expected mappings.
     */
    putMappings: () => putMappings(context),

    /**
     * Updates the index template to reflect the expected mappings.
     */
    putTemplate: () => putTemplate(context),
  };
}

async function migrationContext(opts: MigratorOpts): Promise<MigrationContext> {
  const { callCluster, index } = opts;
  const indexMappings = await fetchOrDefault(
    fetchMapping(callCluster, index),
    null
  );
  const activeMappings = buildMappings(opts);
  const fullMappings = mergeMappings(
    _.get(indexMappings, 'doc.properties', {}),
    activeMappings
  );

  return {
    ...opts,
    activeMappings,
    fullMappings,
    indexMappings,
    indexVersion: getIndexVersion(fullMappings),
  };
}

async function patchIndex(context: MigrationContext) {
  const { indexMappings, activeMappings, index, kibanaVersion } = context;
  if (!indexMappings) {
    return;
  }
  const indexVersion = getIndexVersion(indexMappings);
  const action = migrationType(
    indexVersion,
    kibanaVersion,
    indexMappings,
    activeMappings
  );
  switch (action) {
    case 'none':
      return;
    case 'upgrade':
      return await upgradeIndex(context);
    case 'downgrade':
      throw new Error(
        `Cannot automatically downgrade from "${indexVersion}" to "${kibanaVersion}". If you want to manually downgrade, you need to manually set the kibanaVersion in the mapping metadata for index "${index}".`
      );
  }
}

function putTemplate({ callCluster, index, fullMappings }: MigrationContext) {
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

function putMappings({ callCluster, index, fullMappings }: MigrationContext) {
  return callCluster('indices.putMapping', {
    body: fullMappings.doc,
    index,
    type: 'doc',
  });
}

async function upgradeIndex(context: MigrationContext) {
  await putMappings(context);
  await putTemplate(context);
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

function getIndexVersion(mappings: IndexMapping) {
  return _.get(mappings, '.doc._meta.kibanaVersion', '');
}
