// Migration state contains all of the data we need to persist in an index
// in order to know: 1. do we need to migrate? 2. what migrations
// and mappings have already been applied? 3. mapping info for disabled plugins

const _ = require('lodash');
const objectHash = require('object-hash');
const { disabledPluginIds } = require('./plugins');

export const MigrationStatus = {
  migrating: 'migrating',
  migrated: 'migrated',
  outOfDate: 'outOfDate',
};

export const defaultMigrationState = {
  status: MigrationStatus.outOfDate,
  plugins: [],
};

// The mapping that allows us to store migration state in an index
export const migrationMapping = {
  migration: {
    properties: {
      status: { type: 'keyword' },
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

// Migration state includes a plugin's mappings. This is so that we can keep a plugin's data
// around even if the plugin is disabled / removed.
export function buildMigrationState(plugins, previousState = defaultMigrationState) {
  const isDisabled = disabledPluginIds(plugins, previousState).reduce((acc, k) => _.set(acc, k, true), {});
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
    status: MigrationStatus.migrated,
    plugins: disabledPlugins.concat(enabledPlugins),
  };
}

// We can't just compare a single checksum, as we may have some plugins that are now disabled,
// but which were enabled at one point, and whose migrations are already in the index. So, this
// status check ignores disabled plugins, as their data is vestigial.
export function computeMigrationStatus(plugins, migrationState) {
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

function pluginChecksum({ mappings, migrations }) {
  return {
    mappingsChecksum: mappings ? objectHash(mappings) : '',
    migrationsChecksum: objectHash(migrations.map(({ id }) => id)),
  };
}
