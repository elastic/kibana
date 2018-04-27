// Migration state contains all of the data we need to persist in an index
// in order to know: 1. do we need to migrate? 2. what migrations
// and mappings have already been applied? 3. mapping info for disabled plugins

const _ = require('lodash');
const objectHash = require('object-hash');
const Plugins = require('./plugins');
const MigrationStatus = require('./migration_status');
const Persistence = require('./persistence');
const { DOC_TYPE } = require('./documents');

const TYPE = 'migration';
const ID = `${TYPE}:migration-state`;

const empty = {
  status: MigrationStatus.outOfDate,
  plugins: [],
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
      plugins: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          mappings: { type: 'text' },
          mappingsChecksum: { type: 'keyword' },
          migrationIds: { type: 'keyword' },
          migrationsChecksum: { type: 'keyword' },
        },
      },
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
  trimForExport,
};

function trimForExport({ plugins }) {
  return {
    plugins: plugins.map(plugin => _.pick(plugin, ['id', 'mappingsChecksum', 'migrationIds', 'migrationsChecksum'])),
  };
}

// Migration state includes a plugin's mappings. This is so that we can keep a plugin's data
// around even if the plugin is disabled / removed.
function build(plugins, previousIndex, previousState = empty) {
  const isDisabled = Plugins.disabledIds(plugins, previousState).reduce((acc, k) => _.set(acc, k, true), {});
  const disabledPlugins = previousState.plugins.filter(({ id }) => isDisabled[id]);
  const enabledPlugins = plugins.map((plugin) => {
    const { id, mappings, migrations } = plugin;
    return {
      ...pluginChecksum(plugin),
      id,
      mappings: JSON.stringify(mappings),
      migrationIds: migrations.map(({ id }) => id),
    };
  });
  return {
    previousIndex,
    status: MigrationStatus.migrated,
    plugins: disabledPlugins.concat(enabledPlugins),
  };
}

// We can't just compare a single checksum, as we may have some plugins that are now disabled,
// but which were enabled at one point, and whose migrations are already in the index. So, this
// status check ignores disabled plugins, as their data is vestigial.
function status(plugins, migrationState) {
  if (migrationState.status === MigrationStatus.migrating) {
    return MigrationStatus.migrating;
  }

  const pluginState = _.indexBy(migrationState.plugins, 'id');
  const isMigrated = plugins.every((plugin) => {
    const { migrationsChecksum, mappingsChecksum } = pluginChecksum(plugin);
    const state = pluginState[plugin.id];
    return state && state.migrationsChecksum === migrationsChecksum && state.mappingsChecksum === mappingsChecksum;
  });

  return isMigrated ? MigrationStatus.migrated : MigrationStatus.outOfDate;
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
  await Persistence.applyMappings(callCluster, index, { properties: mappings });
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

function pluginChecksum({ mappings, migrations }) {
  return {
    mappingsChecksum: mappings ? objectHash(mappings) : '',
    migrationsChecksum: objectHash(migrations.map(({ id }) => id)),
  };
}
