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

/**
 * The MigrationOpts interface defines the minimum set of data required
 * in order to properly migrate an index. MigrationContext expands this
 * with computed values and values from the index being migrated, and is
 * serves as a central blueprint for what migrations will end up doing.
 */

import { buildActiveMappings } from './build_active_mappings';
import { CallCluster, MappingProperties } from './call_cluster';
import { VersionedTransformer } from './document_migrator';
import { fetchInfo, FullIndexInfo } from './elastic_index';
import { LogFn, Logger, MigrationLogger } from './migration_logger';

export interface MigrationOpts {
  batchSize: number;
  pollInterval: number;
  scrollDuration: string;
  callCluster: CallCluster;
  index: string;
  log: LogFn;
  mappingProperties: MappingProperties;
  documentMigrator: VersionedTransformer;
}

export interface Context {
  callCluster: CallCluster;
  alias: string;
  source: FullIndexInfo;
  dest: FullIndexInfo;
  documentMigrator: VersionedTransformer;
  log: Logger;
  batchSize: number;
  pollInterval: number;
  scrollDuration: string;
}

/**
 * Builds up an uber object which has all of the config options, settings,
 * and various info needed to migrate the source index.
 */
export async function migrationContext(opts: MigrationOpts): Promise<Context> {
  const { callCluster } = opts;
  const log = new MigrationLogger(opts.log);
  const alias = opts.index;
  const source = createSourceContext(await fetchInfo(callCluster, alias), alias);
  const dest = createDestContext(source, alias, opts.mappingProperties);

  return {
    callCluster,
    alias,
    source,
    dest,
    log,
    batchSize: opts.batchSize,
    documentMigrator: opts.documentMigrator,
    pollInterval: opts.pollInterval,
    scrollDuration: opts.scrollDuration,
  };
}

function createSourceContext(source: FullIndexInfo, alias: string) {
  if (source.exists && source.indexName === alias) {
    return {
      ...source,
      indexName: nextIndexName(alias, alias),
    };
  }

  return source;
}

function createDestContext(
  source: FullIndexInfo,
  alias: string,
  mappingProperties: MappingProperties
): FullIndexInfo {
  const activeMappings = buildActiveMappings({ properties: mappingProperties });

  return {
    aliases: {},
    exists: false,
    indexName: nextIndexName(source.indexName, alias),
    mappings: {
      doc: {
        ...activeMappings.doc,
        properties: {
          ...source.mappings.doc.properties,
          ...activeMappings.doc.properties,
        },
      },
    },
  };
}

/**
 * Gets the next index name in a sequence, based on specified current index's info.
 * We're using a numeric counter to create new indices. So, `.kibana_1`, `.kibana_2`, etc
 * There are downsides to this, but it seemed like a simple enough approach.
 */
function nextIndexName(indexName: string, alias: string) {
  const indexSuffix = (indexName.match(/[\d]+$/) || [])[0];
  const indexNum = parseInt(indexSuffix, 10) || 0;

  return `${alias}_${indexNum + 1}`;
}
