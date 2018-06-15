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

/*//////////////////////////////////////////////////////////////////

This file contains the core migraiton logic for migrating saved
object indices between major versions of Kibana. It is not index-
specific (e.g. has no logic that is specific to .kibana). 
Its primary tests are integration tests found in:

test/api_integration/apis/migrations.

//////////////////////////////////////////////////////////////////*/

import _ from 'lodash';
import Version from 'semver';
import { computeDroppedTypes } from './compute_dropped_types';
import { computeSupportedTypes } from './compute_supported_types';
import { createDocTransform } from './create_doc_transform';
import { fetchMapping } from './fetch_mapping';
import { fetchOrDefault } from './fetch_or_default';
import { getActiveMappings } from './get_active_mappings';
import {
  CallCluster,
  IndexMapping,
  MigrationPlugin,
  RawDoc,
  SavedObjectDoc,
} from './types';

///////////////////////////////////////////////////////////////////
// Migration function argument types
///////////////////////////////////////////////////////////////////

type LogFn = (meta: string[], message: string) => void;

export interface MigrationOpts {
  callCluster: CallCluster;
  index: string;
  kibanaVersion: string;
  log: LogFn;
  plugins: MigrationPlugin[];
  dropUnsupportedTypes?: boolean;
}

///////////////////////////////////////////////////////////////////
// Migration function results
///////////////////////////////////////////////////////////////////

export type MigrationResult =
  | MigrationSuccess
  | MigrationSkipped
  | MigrationFailed;

export interface MigrationSkipped {
  status: 'skipped';
  reason: string;
}

export interface MigrationFailed {
  status: 'failed';
  reason: string;
  details: FailIndexExists | FailUnsupporedTypes | FailIndexNewer;
}

export interface MigrationSuccess {
  status: 'success';
  details: {
    destIndex: string;
    docsDropped: number;
    docsMigrated: number;
    elapsedMs: number;
  };
}

export interface FailIndexExists {
  code: 'indexExists';
  index: string;
}

export interface FailUnsupporedTypes {
  code: 'unsupporedTypes';
  typeCounts: { [type: string]: number };
}

export interface FailIndexNewer {
  code: 'indexNewer';
  indexVersion: string;
  kibanaVersion: string;
}

///////////////////////////////////////////////////////////////////
// Internal types
///////////////////////////////////////////////////////////////////

interface AliasInfo {
  [index: string]: any;
}

interface MigrationStats {
  startTime: number;
  docsMigrated: number;
  docsDropped: number;
}

interface MigrationContext extends MigrationOpts {
  aliasInfo: AliasInfo | null;
  destIndex: string;
  majorVersion: number;
  stats: MigrationStats;
}

type BulkDocsHandler = (docs: RawDoc[]) => Promise<any>;

type MigrationPromise = Promise<MigrationResult | void>;

type MigrationFn = (context: MigrationContext) => MigrationPromise;

///////////////////////////////////////////////////////////////////
// Core migration logic
///////////////////////////////////////////////////////////////////

const migrate = pipe(
  skipIfNoIndex,
  skipIfUpToDate,
  failIfIndexIsNewer,
  failIfDestExists,
  failIfUnsupportedTypes,
  convertIndexToAlias,
  createDestIndex,
  migrateDocs,
  pointAliasToDest,
  buildMigrationResult
);

/**
 * migrateIndex migrates all documents from one index to another, upgrading
 * them as necessary in the process.
 *
 * @param {MigrationOpts} opts
 * @param {CallCluster} callCluster - The elasticsearch.js function
 * @param {string} index - The name of the alias or index being migrated
 * @param {string} kibanaVersion - The version of Kibana that is being executed
 * @param {LogFn} log - A function with the same signature as Kibana's server.log
 * @param {MigrationPlugin[]} plugins - An array of plugins whose mappings and migrations
 *    will be used to migrate the index.
 * @param {boolean} [dropUnsupportedTypes] - If true, migration will drop any docs whose
 *    types are not supported by the plugins. If false, migration will fail if any such
 *    docs are detected.
 * @returns {Promise<MigrationResult>} - See the type definitions in core/migrate_index.ts
 *    for more detail.
 */
export async function migrateIndex(
  opts: MigrationOpts
): Promise<MigrationResult> {
  const context = await createMigrationContext(opts);
  return (await migrate(context)) as MigrationResult;
}

async function createMigrationContext(
  opts: MigrationOpts
): Promise<MigrationContext> {
  const { callCluster, index, kibanaVersion } = opts;
  const majorVersion = Version.major(kibanaVersion);
  const aliasInfo = await fetchOrDefault(
    callCluster('indices.getAlias', { name: index }),
    null
  );
  return {
    ...opts,
    aliasInfo,
    destIndex: indexName(index, majorVersion),
    majorVersion,
    stats: {
      docsDropped: 0,
      docsMigrated: 0,
      startTime: Date.now(),
    },
  };
}

function pipe(...fns: MigrationFn[]): MigrationFn {
  return async (
    context: MigrationContext
  ): Promise<MigrationResult | undefined> => {
    for (const fn of fns) {
      const result = await fn(context);
      if (result) {
        return result;
      }
    }
  };
}

async function skipIfNoIndex({ callCluster, index }: MigrationContext) {
  if (!(await callCluster('indices.exists', { index }))) {
    return migrationSkipped(`Index "${index}" does not exist.`);
  }
}

async function skipIfUpToDate({
  aliasInfo,
  index,
  destIndex,
}: MigrationContext) {
  const isUpToDate = aliasInfo && aliasInfo.hasOwnProperty(destIndex);
  if (isUpToDate) {
    return migrationSkipped(`Alias "${index}" is already migrated.`);
  }
}

function migrationSkipped(reason: string): MigrationSkipped {
  return { reason, status: 'skipped' };
}

function indexName(prefix: string, version: number) {
  return `${prefix}-${version}`;
}

async function failIfIndexIsNewer(context: MigrationContext): MigrationPromise {
  const { callCluster, index, kibanaVersion } = context;
  const mappings = await fetchMapping(callCluster, index);
  const semver = _.get(mappings, 'doc._meta.kibanaVersion', null);

  if (semver && Version.gt(Version.coerce(semver)!, kibanaVersion)) {
    return {
      details: {
        code: 'indexNewer',
        indexVersion: semver,
        kibanaVersion,
      },
      reason: `Index "${index} v${semver}" is newer than Kibana (v${kibanaVersion}).`,
      status: 'failed',
    };
  }
}

async function failIfUnsupportedTypes(
  context: MigrationContext
): MigrationPromise {
  if (context.dropUnsupportedTypes) {
    return;
  }
  const { callCluster, index, kibanaVersion, plugins } = context;
  const typeCounts = await computeDroppedTypes({
    callCluster,
    index,
    kibanaVersion,
    plugins,
  });
  if (!_.isEmpty(typeCounts)) {
    return {
      details: {
        code: 'unsupporedTypes',
        typeCounts,
      },
      reason: `The index contains unsupported types ${Object.keys(
        typeCounts
      ).join(', ')}.`,
      status: 'failed',
    };
  }
}

async function createDestIndex({
  callCluster,
  index,
  destIndex,
  kibanaVersion,
  plugins,
  log,
}: MigrationContext) {
  logInfo(log, `Creating index "${destIndex}".`);
  const activeMappings = getActiveMappings({ kibanaVersion, plugins });
  await cloneIndexSettings(callCluster, index, destIndex, activeMappings);
}

async function failIfDestExists({
  callCluster,
  destIndex,
}: MigrationContext): MigrationPromise {
  if (await callCluster('indices.exists', { index: destIndex })) {
    return {
      details: { code: 'indexExists', index: destIndex },
      reason: `Index "${destIndex}" already exists.`,
      status: 'failed',
    };
  }
}

async function convertIndexToAlias(context: MigrationContext) {
  const { aliasInfo, callCluster, index, kibanaVersion, log } = context;
  if (aliasInfo) {
    return;
  }
  logInfo(log, `Converting "${index}" to alias.`);
  const majorVersion = Version.major(kibanaVersion);
  const newName = indexName(index, majorVersion - 1);
  const mappings = await fetchMapping(callCluster, index);
  await cloneIndexSettings(callCluster, index, newName, mappings!);
  await reindex(callCluster, index, newName);
  await callCluster('indices.updateAliases', {
    body: {
      actions: [
        { remove_index: { index } },
        { add: { index: newName, alias: index } },
      ],
    },
  });
}

async function cloneIndexSettings(
  callCluster: CallCluster,
  sourceIndex: string,
  destIndex: string,
  mappings: IndexMapping
) {
  const settings = await getIndexSettings(callCluster, sourceIndex);
  const {
    index: { number_of_replicas, number_of_shards },
  } = settings;
  return callCluster('indices.create', {
    body: {
      mappings,
      settings: {
        index: {
          number_of_replicas,
          number_of_shards,
        },
      },
    },
    index: destIndex,
  });
}

async function getIndexSettings(callCluster: CallCluster, index: string) {
  // Result has an odd shape: {index-name: {settings: ...}}
  // Where index-name might be: 'kibana-213423423' so, we just grab the settings
  // from the first value.
  const result = await callCluster('indices.getSettings', { index });
  return Object.values(result)[0].settings;
}

function reindex(
  callCluster: CallCluster,
  sourceIndex: string,
  destIndex: string
) {
  return callCluster('reindex', {
    body: {
      dest: {
        index: destIndex,
      },
      source: {
        index: sourceIndex,
      },
    },
    refresh: true,
    waitForCompletion: true,
  });
}

async function migrateDocs({
  callCluster,
  index,
  destIndex,
  kibanaVersion,
  plugins,
  stats,
  log,
}: MigrationContext): MigrationPromise {
  logInfo(log, `Migrating docs from "${index}" to "${destIndex}".`);
  const supportedTypes = _.indexBy(
    computeSupportedTypes({ kibanaVersion, plugins }),
    _.identity
  );
  const transform = createDocTransform({ kibanaVersion, plugins });
  await eachScroll(callCluster, index, async docs => {
    const [supportedDocs, unsupporedDocs] = _.partition(
      docs.map(rawToSavedObject),
      ({ type }) => supportedTypes.hasOwnProperty(type)
    );
    stats.docsMigrated += supportedDocs.length;
    stats.docsDropped += unsupporedDocs.length;
    await bulkInsert(
      callCluster,
      destIndex,
      supportedDocs.map(doc => savedObjectToRaw(transform(doc)))
    );
  });
}

async function pointAliasToDest({
  callCluster,
  index,
  destIndex,
}: MigrationContext) {
  const aliasInfo = await fetchOrDefault(
    callCluster('indices.getAlias', { name: index }),
    {}
  );
  const removeActions = Object.keys(aliasInfo).map(key => ({
    remove: { index: key, alias: index },
  }));
  await callCluster('indices.updateAliases', {
    body: {
      actions: [...removeActions, { add: { index: destIndex, alias: index } }],
    },
  });
  await callCluster('indices.refresh', { index });
}

async function buildMigrationResult({
  stats,
  destIndex,
}: MigrationContext): MigrationPromise {
  return {
    details: {
      destIndex,
      docsDropped: stats.docsDropped,
      docsMigrated: stats.docsMigrated,
      elapsedMs: Date.now() - stats.startTime,
    },
    status: 'success',
  };
}

async function eachScroll(
  callCluster: CallCluster,
  index: string,
  eachFn: BulkDocsHandler,
  size: number = 100
) {
  const scroll = '1m';
  let result = await callCluster('search', { index, scroll, body: { size } });

  while (result.hits.hits.length) {
    await eachFn(result.hits.hits);
    result = await callCluster('scroll', {
      scroll,
      scrollId: result._scroll_id!,
    });
  }
}

function logInfo(log: LogFn, message: string) {
  log(['info', 'migration'], message);
}

function savedObjectToRaw({
  id,
  type,
  attributes,
  migrationVersion,
}: SavedObjectDoc): RawDoc {
  return {
    _id: `${type}:${id}`,
    _source: {
      migrationVersion,
      type,
      [type]: attributes,
    },
  };
}

function rawToSavedObject({ _id, _source }: RawDoc): SavedObjectDoc {
  const { type } = _source;
  const id = _id.slice(type.length + 1);
  return {
    attributes: _source[type],
    id,
    migrationVersion: _source.migrationVersion || 0,
    type,
  };
}

async function bulkInsert(
  callCluster: CallCluster,
  index: string,
  docs: RawDoc[]
) {
  const bulkActions: object[] = [];
  docs.forEach(doc => {
    bulkActions.push({
      index: {
        _id: doc._id,
        _index: index,
        _type: 'doc',
      },
    });
    bulkActions.push(doc._source);
  });

  const result = await callCluster('bulk', { body: bulkActions });
  const err = result.items.find(
    ({ index: { error } }) => !!error && !!error.type && !!error.reason
  );
  if (err) {
    throw err;
  }
  return result;
}
