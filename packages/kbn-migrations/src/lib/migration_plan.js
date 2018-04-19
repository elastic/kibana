const _ = require('lodash');
const MigrationState = require('./migration_state');
const Plugins = require('./plugins');

module.exports = {
  build,
  buildMappings,
};

// Given the current set of enabled plugins, and the previous
// or default migration state, this returns the mappings and
// migrations which need to be applied.
function build(plugins, migrationState, includeDisabledPlugins = true) {
  return {
    mappings: buildMappings(plugins, migrationState, includeDisabledPlugins),
    migrations: unappliedMigrations(plugins, migrationState),
  };
}

function unappliedMigrations(plugins, migrationState) {
  const previousPlugins = _.indexBy(migrationState.plugins, 'id');
  return _(plugins)
    .map(({ id, migrations }) => {
      const numApplied = _.get(previousPlugins, [id, 'migrationIds', 'length'], 0);
      return _.slice(migrations, numApplied).map(m => ({ ...m, pluginId: id }));
    })
    .flatten()
    .compact()
    .value();
}

// Given a list of plugins and the current migration state of the index,
// builds the mappings to be applied to the next version of the index.
// Mappings associated w/ disabled plugins are moved as-is.
function buildMappings(plugins, migrationState, includeDisabledPlugins) {
  const disabledPlugins = includeDisabledPlugins ? disabledPluginMappings(plugins, migrationState) : [];
  const migrationMappings = {
    id: 'migrations',
    mappings: MigrationState.mappings
  };
  return {
    doc: {
      dynamic: 'strict',
      properties: mergeMappings([
        migrationMappings,
        ...disabledPlugins,
        ...plugins,
      ]),
    },
  };
}

function disabledPluginMappings(plugins, migrationState) {
  const mappingsById = _.indexBy(migrationState.plugins, 'id');
  return Plugins.disabledIds(plugins, migrationState)
    .map(id => ({ id, mappings: JSON.parse(mappingsById[id].mappings) }));
}

// Shallow merge of the specified objects into one object, if any property
// conflicts occur, this will bail with an error.
function mergeMappings(mappings) {
  return mappings
    .filter(({ mappings }) => !!mappings)
    .reduce((acc, { id, mappings }) => {
      const invalidKey = Object.keys(mappings).find(k => k.startsWith('_') || acc.hasOwnProperty(k));
      if (_.startsWith(invalidKey, '_')) {
        throw new Error(`Invalid mapping "${invalidKey}" in plugin "${id}". Mappings cannot start with _.`);
      }
      if (invalidKey) {
        throw new Error(`Plugin "${id}" is attempting to redefine mapping "${invalidKey}".`);
      }
      return Object.assign(acc, mappings);
    }, {});
}
