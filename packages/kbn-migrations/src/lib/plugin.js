const _ = require('lodash');
const objectHash = require('object-hash');

module.exports = {
  sanitize,
  disabledIds,
  validate,
};

function disabledIds(plugins, migrationState) {
  return _.difference(_.map(migrationState.plugins, 'id'), _.map(plugins, 'id'));
}

function sanitize(plugins) {
  return plugins
    .filter(({ mappings, migrations }) => !!mappings || !!migrations)
    .map(p => ({
      ...p,
      migrations: p.migrations || [],
      migrationsChecksum: objectHash((p.migrations || []).map(({ id }) => id)),
      mappingsChecksum: p.mappings ? objectHash(p.mappings) : '',
    }));
}

function validate(plugins, migrationState = { plugins: [] }) {
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
