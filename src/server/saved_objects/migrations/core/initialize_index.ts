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
import { loadFullMappings } from './mappings';
import { CallCluster, IndexMapping, MigrationPlugin } from './types';

export interface InitializeOpts {
  callCluster: CallCluster;
  index: string;
  plugins: MigrationPlugin[];
}

interface InitializeContext extends InitializeOpts {
  activeMappings: IndexMapping;
  fullMappings: IndexMapping;
}

/**
 * Creates an object that can be used to manage a saved object client index.
 *
 * @param opts
 * @prop {CallCluster} callCluster - The Elasticsearch connection to be used
 * @prop {string} index - The name of the index or alias being managed
 * @prop {MigrationPlugin[]} plugins - A list of plugins whose mappings and transforms will be applied to the index
 */
export async function initializeIndex(opts: InitializeOpts) {
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
