const _ = require('lodash');

module.exports = {
  sanitizePlugins,
  disabledPluginIds,
  validatePlugins,
};

function disabledPluginIds(plugins, migrationState) {
  return _.difference(_.map(migrationState.plugins, 'id'), _.map(plugins, 'id'));
}

function sanitizePlugins(plugins) {
  return plugins
    .filter(({ mappings, migrations }) => !!mappings || !!migrations)
    .map(p => ({
      ...p,
      migrations: p.migrations || [],
    }));
}

function validatePlugins(rawPlugins, migrationState = { plugins: [] }) {
  const plugins = sanitizePlugins(rawPlugins);
  const hash = _.indexBy(migrationState.plugins, 'id');
  plugins.forEach((plugin) => {
    assertValidPlugin(plugin, hash[plugin.id] || {});
  });
  return plugins;
}

function assertValidPlugin(plugin, pluginState) {
  assertConsistentOrder(plugin, pluginState);
  assertUniqueMigrationIds(plugin);
}

function assertConsistentOrder({ id, migrations }, { migrationIds }) {
  if (!migrationIds) {
    return;
  }
  for (let i = 0; i < migrationIds.length; ++i) {
    const actual = migrations[i] && migrations[i].id;
    const expected = migrationIds[i];
    if (actual !== expected) {
      throw new Error(`Plugin "${id}" migration order has changed. Expected migration "${expected}", but found "${actual}".`);
    }
  }
}

function assertUniqueMigrationIds({ id, migrations }) {
  const dup = duplicatedId(migrations);
  if (dup) {
    throw new Error(`Plugin "${id}" has migration "${dup}" defined more than once.`);
  }
}

function duplicatedId(migrations) {
  const ids = _.groupBy(_.map(migrations, 'id'), _.identity);
  const dup = _.first(_.reject(_.values(ids), arr => arr.length < 2));
  return _.first(dup);
}
