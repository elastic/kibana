// The migration context object contains all of the data and functions
// that are necessary to analyze and run migrations.

const _ = require('lodash');
const objectHash = require('object-hash');
const Plugins = require('./plugins');
const MigrationPlan = require('./migration_plan');
const MigrationState = require('./migration_state');
const Persistence = require('./persistence');

module.exports = {
  fetch,
};

async function fetch(opts) {
  const { callCluster, log, index, plugins, elasticVersion, force } = opts;
  const [currentIndex, { migrationState, migrationStateVersion }] = await Promise.all([
    Persistence.getCurrentIndex(callCluster, index),
    MigrationState.fetch(callCluster, index),
  ]);
  const sanitizedPlugins = Plugins.validate(plugins, migrationState);
  const migrationPlan = MigrationPlan.build(sanitizedPlugins, migrationState);
  const nextMigrationState = MigrationState.build(sanitizedPlugins, currentIndex, migrationState);
  const sha = objectHash(nextMigrationState.plugins);
  return {
    index,
    callCluster,
    migrationState,
    migrationStateVersion,
    nextMigrationState,
    migrationPlan,
    force,
    plugins: sanitizedPlugins,
    destIndex: `${index}-${elasticVersion}-${sha}`,
    initialIndex: `${index}-original-${sha}`,
    log: log ? migrationLogger(log) : _.noop,
  };
}

function migrationLogger(log) {
  const logFn = prefix => msg => log(prefix, typeof msg === 'function' ? msg() : msg);
  return {
    info: logFn(['info', 'migration']),
    debug: logFn(['debug', 'migration']),
    error: logFn(['error', 'migration']),
  };
}
