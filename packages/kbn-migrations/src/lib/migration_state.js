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

// The migration state contains all of the data we need to persist in an index
// in order to know: 1. do we need to migrate? 2. what migrations
// and mappings have already been applied? 3. mapping info for disabled plugins

const _ = require('lodash');
const objectHash = require('./object_hash');
const MigrationStatus = require('./migration_status');
const Persistence = require('./persistence');
const { DOC_TYPE } = require('./document');

const TYPE = 'migration';
const ID = `${TYPE}:migration-state`;

const empty = {
  status: MigrationStatus.outOfDate,
  types: [],
};

// The mapping that allows us to store migration state in an index
const mappings = {
  type: {
    type: 'keyword'
  },
  updated_at: {
    type: 'date'
  },
  config: {
    dynamic: true,
    properties: {
      buildNum: {
        type: 'keyword'
      }
    }
  },
  migration: {
    properties: {
      status: { type: 'keyword' },
      previousIndex: { type: 'keyword' },
      types: {
        properties: {
          type: { type: 'keyword' },
          checksum: { type: 'keyword' },
          migrationIds: { type: 'keyword' },
        }
      }
    },
  },
};

module.exports = {
  TYPE,
  ID,
  empty,
  mappings,
  build,
  status,
  fetch,
  save,
};

// We need the previous state, if any, so that we don't lose migration info
// for plugins that are no longer active in the system but whose docs remain.
// The checksum is a combination of mappings for a type as well as that type's
// migration ids, so that if either changes, we can detect that we are out of date.
function build(plugins, previousIndex, previousState = empty) {
  const types = _(plugins).map(pluginTypes).flatten();

  return {
    previousIndex,
    status: MigrationStatus.migrated,
    types: _(types)
      .concat(previousState.types)
      .compact()
      .unique(({ type }) => type)
      .sortBy('type')
      .value(),
  };
}

// Compares the stored migration state with the current migration state
// to determine what the migration status is:
// migrating - a migration is running
// outOfDate - migrations need to run
// migrated - everything is up to date
function status(currentMigrationState, storedMigrationState) {
  if (storedMigrationState.status === MigrationStatus.migrating) {
    return MigrationStatus.migrating;
  }
  const storedTypes = _.indexBy(storedMigrationState.types, 'type');
  const isMigrated = currentMigrationState.types.every(({ type, checksum }) => _.get(storedTypes, [type, 'checksum']) === checksum);
  if (isMigrated) {
    return MigrationStatus.migrated;
  }
  // Verify that we can in fact migrate this, and throw if not.
  currentMigrationState.types.forEach(assertValidMigrationOrder(storedTypes));
  return MigrationStatus.outOfDate;
}

async function fetch(callCluster, index) {
  const result = await Persistence.fetchOrNull(callCluster('get', {
    index,
    id: ID,
    type: DOC_TYPE,
  }));

  if (result) {
    return {
      migrationStateVersion: result._version,
      migrationState: result._source.migration,
    };
  }

  return {
    migrationStateVersion: undefined,
    migrationState: empty,
  };
}

async function save(callCluster, index, version, migrationState) {
  // Apply the bare-minimum mappings required in order to store migrationState,
  // as we are applying this to existing indices in some cases.
  await Persistence.applyMappings(callCluster, index, {
    properties: _.pick(mappings, ['migration', 'type']),
  });
  return await callCluster('update', {
    index,
    version,
    id: ID,
    type: DOC_TYPE,
    body: {
      doc: {
        type: TYPE,
        migration: migrationState,
      },
      doc_as_upsert: true,
    },
  });
}

function pluginTypes(plugin) {
  const migrationsByType = _.groupBy(plugin.migrations, 'type');
  return _.chain(_.keys(migrationsByType))
    .concat(_.keys(plugin.mappings))
    .uniq()
    .value()
    .map((type) => {
      const migrationIds = _.map(_.get(migrationsByType, type, []), 'id');
      const mapping = _.get(plugin.mappings, type);
      const checksum = objectHash({ migrationIds, mapping });

      assertUniqueMigrationIds(plugin, migrationIds);

      return { type, checksum, migrationIds };
    });
}

function assertUniqueMigrationIds(plugin, migrationIds) {
  const dup = _.chain(migrationIds)
    .groupBy(_.identity)
    .values()
    .find(v => v.length > 1)
    .first()
    .value();

  if (dup) {
    throw new Error(`Plugin "${plugin.id}" has migration "${dup}" defined more than once.`);
  }
}


function assertValidMigrationOrder(storedTypes) {
  return ({ type, migrationIds }) => {
    const storedIds = _.get(storedTypes, [type, 'migrationIds'], []);
    if (storedIds.length > migrationIds.length) {
      throw new Error(
        `Type "${type}" has had ${storedIds.length} migrations applied to it, but only ${migrationIds.length} migrations are known.`
      );
    }
    for (let i = 0; i < storedIds.length; ++i) {
      const actual = migrationIds[i];
      const expected = storedIds[i];
      if (actual !== expected) {
        throw new Error(`Type "${type}" migration order has changed. Expected migration "${expected}", but found "${actual}".`);
      }
    }
  };
}
