// The migration context object contains all of the data and functions
// that are necessary to analyze and run migrations.

const _ = require('lodash');
const objectHash = require('object-hash');
const Plugins = require('./plugins');
const MigrationPlan = require('./migration_plan');
const MigrationState = require('./migration_state');

module.exports = {
  fetch,
};

async function fetch(opts) {
  const { callCluster, log, index, plugins, elasticVersion, force } = opts;
  const { migrationState, migrationStateVersion } = await MigrationState.fetch(callCluster, index);
  const sanitizedPlugins = Plugins.validate(plugins, migrationState);
  const migrationPlan = MigrationPlan.build(sanitizedPlugins, migrationState);
  const nextMigrationState = MigrationState.build(sanitizedPlugins, migrationState);
  const sha = objectHash(nextMigrationState);
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
  };
}
