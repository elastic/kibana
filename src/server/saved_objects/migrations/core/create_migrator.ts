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
import { createDocTransform } from './create_doc_transform';
import { loadMappings } from './mappings';
import {
  CallCluster,
  IndexMapping,
  MigrationPlugin,
  SavedObjectDoc,
  TransformFn,
} from './types';

export interface Migrator {
  patchIndex: () => Promise<any>;
  transformDoc: TransformFn;
}

export interface MigratorOpts {
  kibanaVersion: string;
  callCluster: CallCluster;
  index: string;
  plugins: MigrationPlugin[];
  log: (meta: string[], message: string) => void;
}

interface MigrationContext extends MigratorOpts {
  activeMappings: IndexMapping;
  fullMappings: IndexMapping;
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
export async function createMigrator(opts: MigratorOpts): Promise<Migrator> {
  const context = await migrationContext(opts);
  const docTransformer = createDocTransform(opts);

  return {
    /**
     * Patches the index template and mappings, if the index is out of date.
     */
    patchIndex: () => patchIndex(context),

    /**
     * Transforms a document from one version to the current version.
     * @param {SavedObjectDoc} doc - A saved object client document
     * @returns {SavedObjectDoc}
     */
    transformDoc(doc: SavedObjectDoc): SavedObjectDoc {
      try {
        return docTransformer(doc);
      } catch (error) {
        opts.log(
          ['info', 'migration'],
          `Failed to transform doc: ${error.message}, context: ${JSON.stringify(
            error.transform
          )}`
        );
        throw error;
      }
    },
  };
}

async function migrationContext(opts: MigratorOpts): Promise<MigrationContext> {
  const { activeMappings, fullMappings } = await loadMappings(opts);

  return {
    ...opts,
    activeMappings,
    fullMappings,
  };
}

async function patchIndex(context: MigrationContext) {
  await putTemplate(context);
  if (await indexExists(context)) {
    await putMappings(context);
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

function indexExists({ callCluster, index }: MigrationContext) {
  return callCluster('indices.exists', { index });
}
