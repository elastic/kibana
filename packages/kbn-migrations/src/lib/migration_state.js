// Migration state contains all of the data we need to persist in an index
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
  const previousTypes = _.indexBy(previousState.types, 'type');
  const updatedTypes = plugins.reduce((acc, plugin) => Object.assign(acc, pluginTypes(plugin)), previousTypes);

  return {
    previousIndex,
    types: _.values(updatedTypes),
    status: MigrationStatus.migrated,
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
    .reduce((acc, type) => {
      const migrations = _.get(migrationsByType, type, []);
      const migrationIds = uniqueMigrationIds(plugin, migrations);
      const checksum = objectHash({ migrationIds, mapping: _.get(plugin.mappings, type) });
      return _.set(acc, type, { type, checksum, migrationIds });
    }, {});
}

function uniqueMigrationIds(plugin, migrations) {
  const migrationIds = _.map(migrations, 'id');
  const dup = _.chain(migrationIds)
    .groupBy(_.identity)
    .values()
    .find(v => v.length > 1)
    .first()
    .value();

  if (dup) {
    throw new Error(`Plugin "${plugin.id}" has migration "${dup}" defined more than once.`);
  }

  return migrationIds;
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
