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

import { SavedObjectsSerializer } from '../../serialization';
import { buildActiveMappings } from './build_active_mappings';
import { CallCluster, MappingProperties } from './call_cluster';
import { VersionedTransformer } from './document_migrator';
import { fetchInfo, FullIndexInfo } from './elastic_index';
import * as Index from './elastic_index';
import { LogFn, Logger, MigrationLogger } from './migration_logger';

import _ from 'lodash';
import { IndexMapping } from './call_cluster';

export enum MigrationAction {
  None = 0,
  Patch = 1,
  Migrate = 2,
}

export interface MigrationOpts {
  batchSize: number;
  pollInterval: number;
  scrollDuration: string;
  callCluster: CallCluster;
  index: string;
  log: LogFn;
  mappingProperties: MappingProperties;
  documentMigrator: VersionedTransformer;
  serializer: SavedObjectsSerializer;
}

export interface Context {
  callCluster: CallCluster;
  alias: string;
  source: FullIndexInfo;
  dest: FullIndexInfo;
  requiresReindex: boolean;
  documentMigrator: VersionedTransformer;
  log: Logger;
  batchSize: number;
  pollInterval: number;
  scrollDuration: string;
  action: MigrationAction;
  serializer: SavedObjectsSerializer;
}

/**
 * Builds up an uber object which has all of the config options, settings,
 * and various info needed to migrate the source index.
 */
export async function migrationContext(opts: MigrationOpts): Promise<Context> {
  const { callCluster, documentMigrator } = opts;
  const log = new MigrationLogger(opts.log);
  const alias = opts.index;
  const source = createSourceContext(await fetchInfo(callCluster, alias), alias);
  const dest = createDestContext(source, alias, opts.mappingProperties);
  const action = await requiredAction({ callCluster, alias, documentMigrator, dest });

  return {
    action,
    callCluster,
    alias,
    source,
    dest,
    log,
    documentMigrator,
    requiresReindex: !source.aliases[alias],
    batchSize: opts.batchSize,
    pollInterval: opts.pollInterval,
    scrollDuration: opts.scrollDuration,
    serializer: opts.serializer,
  };
}

/**
 * Determines what action the migration system needs to take (none, patch, migrate).
 */
export async function requiredAction(context: {
  callCluster: CallCluster;
  alias: string;
  documentMigrator: VersionedTransformer;
  dest: FullIndexInfo;
}): Promise<MigrationAction> {
  const { callCluster, alias, documentMigrator, dest } = context;

  const isUpToDate = await Index.migrationsUpToDate(
    callCluster,
    alias,
    documentMigrator.migrationVersion
  );

  if (!isUpToDate) {
    return MigrationAction.Migrate;
  }

  const refreshedSource = await Index.fetchInfo(callCluster, alias);

  if (!refreshedSource.aliases[alias]) {
    return MigrationAction.Migrate;
  }

  return determineMigrationAction(refreshedSource.mappings, dest.mappings);
}

/**
 * Provides logic that diffs the actual index mappings with the expected
 * mappings. It ignores differences in dynamic mappings.
 *
 * If mappings differ in a patchable way, the result is 'patch', if mappings
 * differ in a way that requires migration, the result is 'migrate', and if
 * the mappings are equivalent, the result is 'none'.
 */
export function determineMigrationAction(
  actual: IndexMapping,
  expected: IndexMapping
): MigrationAction {
  if (actual.doc.dynamic !== expected.doc.dynamic) {
    return MigrationAction.Migrate;
  }

  const actualProps = actual.doc.properties;
  const expectedProps = expected.doc.properties;

  // There's a special case for root-level properties: if a root property is in actual,
  // but not in expected, it is treated like a disabled plugin and requires no action.
  return Object.keys(expectedProps).reduce((acc: number, key: string) => {
    return Math.max(acc, diffSubProperty(actualProps[key], expectedProps[key]));
  }, MigrationAction.None);
}

function diffSubProperty(actual: any, expected: any): MigrationAction {
  // We've added a sub-property
  if (actual === undefined && expected !== undefined) {
    return MigrationAction.Patch;
  }

  // We've removed a sub property
  if (actual !== undefined && expected === undefined) {
    return MigrationAction.Migrate;
  }

  // If a property has changed to/from dynamic, we need to migrate,
  // otherwise, we ignore dynamic properties, as they can differ
  if (isDynamic(actual) || isDynamic(expected)) {
    return isDynamic(actual) !== isDynamic(expected)
      ? MigrationAction.Migrate
      : MigrationAction.None;
  }

  // We have a leaf property, so we do a comparison. A change (e.g. 'text' -> 'keyword')
  // should result in a migration.
  if (typeof actual !== 'object') {
    // We perform a string comparison here, because Elasticsearch coerces some primitives
    // to string (such as dynamic: true and dynamic: 'true'), so we report a mapping
    // equivalency if the string comparison checks out. This does mean that {} === '[object Object]'
    // by this logic, but that is an edge case which should not occur in mapping definitions.
    return `${actual}` === `${expected}` ? MigrationAction.None : MigrationAction.Migrate;
  }

  // Recursively compare the sub properties
  const keys = _.uniq(Object.keys(actual).concat(Object.keys(expected)));
  return keys.reduce((acc: number, key: string) => {
    return acc === MigrationAction.Migrate
      ? acc
      : Math.max(acc, diffSubProperty(actual[key], expected[key]));
  }, MigrationAction.None);
}

function isDynamic(prop: any) {
  return prop && `${prop.dynamic}` === 'true';
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
