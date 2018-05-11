// The migration context object contains all of the data and functions
// that are necessary to analyze and run migrations.

const _ = require('lodash');
const objectHash = require('object-hash');
const Plugin = require('./plugin');
const MigrationPlan = require('./migration_plan');
const MigrationState = require('./migration_state');
const Persistence = require('./persistence');

module.exports = {
  fetch,
};

async function fetch(opts) {
  const { callCluster, log, index, plugins, elasticVersion, force } = opts;
  const initialIndex = `${index}-${elasticVersion}-original`.toLowerCase();
  const [currentIndex, { migrationState, migrationStateVersion }, currentMappings] = await Promise.all([
    Persistence.getCurrentIndex(callCluster, index),
    MigrationState.fetch(callCluster, index),
    Persistence.getMapping(callCluster, index),
  ]);

  Plugin.validate(plugins, migrationState);

  const migrationPlan = MigrationPlan.build(plugins, migrationState, currentMappings);
  const nextMigrationState = MigrationState.build(plugins, currentIndex || initialIndex, migrationState);
  const sha = objectHash(_.map(nextMigrationState.plugins, 'checksum'));
  return {
    index,
    callCluster,
    migrationState,
    migrationStateVersion,
    nextMigrationState,
    migrationPlan,
    force,
    initialIndex,
    plugins,
    destIndex: `${index}-${elasticVersion}-${sha}`.toLowerCase(),
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
