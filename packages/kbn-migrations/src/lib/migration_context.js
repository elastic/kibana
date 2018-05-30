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

const _ = require('lodash');
const objectHash = require('./object_hash');
const MigrationPlan = require('./migration_plan');
const MigrationState = require('./migration_state');
const Persistence = require('./persistence');

module.exports = {
  fetch,
};

// Converts migration options to a more comprehensive object which contains
// all of the data and functions that are necessary to analyze and run migrations.
async function fetch(opts) {
  const { callCluster, log, index, plugins, elasticVersion, force } = opts;
  const { currentIndex, migrationState, migrationStateVersion, currentMappings } = await fetchIndexInfo(callCluster, index);
  const initialIndex = sanitizeIndexName(`${index}-${elasticVersion}-original`);
  const nextMigrationState = MigrationState.build(plugins, currentIndex || initialIndex, migrationState);

  return {
    index,
    callCluster,
    migrationState,
    migrationStateVersion,
    nextMigrationState,
    force,
    initialIndex,
    plugins,
    status: MigrationState.status(nextMigrationState, migrationState),
    migrationPlan: MigrationPlan.build(plugins, migrationState, currentMappings),
    destIndex: destIndex(index, elasticVersion, nextMigrationState.types),
    log: log ? migrationLogger(log) : _.noop,
  };
}

async function fetchIndexInfo(callCluster, index) {
  const [currentIndex, { migrationState, migrationStateVersion }, currentMappings] = await Promise.all([
    Persistence.getCurrentIndex(callCluster, index),
    MigrationState.fetch(callCluster, index),
    Persistence.getMapping(callCluster, index),
  ]);

  return { currentIndex, migrationState, migrationStateVersion, currentMappings };
}

function destIndex(index, elasticVersion, types) {
  const sha = objectHash(_.map(types, 'checksum'));
  return sanitizeIndexName(`${index}-${elasticVersion}-${sha}`);
}

function sanitizeIndexName(indexName) {
  return indexName.toLowerCase();
}

function migrationLogger(log) {
  const logFn = prefix => msg => log(prefix, typeof msg === 'function' ? msg() : msg);
  return {
    info: logFn(['info', 'migration']),
    debug: logFn(['debug', 'migration']),
    error: logFn(['error', 'migration']),
  };
}
