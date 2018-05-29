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
// The migration context object contains all of the data and functions
// that are necessary to analyze and run migrations.

const _ = require('lodash');
const objectHash = require('./object_hash');
const MigrationPlan = require('./migration_plan');
const MigrationState = require('./migration_state');
const Persistence = require('./persistence');

module.exports = {
  fetch,
};

async function fetch(opts) {
  const { callCluster, log, index, plugins, elasticVersion, force } = opts;
  const initialIndex = sanitizeIndexName(`${index}-${elasticVersion}-original`);
  const [currentIndex, { migrationState, migrationStateVersion }, currentMappings] = await Promise.all([
    Persistence.getCurrentIndex(callCluster, index),
    MigrationState.fetch(callCluster, index),
    Persistence.getMapping(callCluster, index),
  ]);
  const migrationPlan = MigrationPlan.build(plugins, migrationState, currentMappings);
  const nextMigrationState = MigrationState.build(plugins, currentIndex || initialIndex, migrationState);
  const status = MigrationState.status(nextMigrationState, migrationState);
  const sha = objectHash(_.map(nextMigrationState.types, 'checksum'));

  return {
    status,
    index,
    callCluster,
    migrationState,
    migrationStateVersion,
    nextMigrationState,
    migrationPlan,
    force,
    initialIndex,
    plugins,
    destIndex: sanitizeIndexName(`${index}-${elasticVersion}-${sha}`),
    log: log ? migrationLogger(log) : _.noop,
  };
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
