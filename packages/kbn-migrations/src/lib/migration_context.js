// The migration context object contains all of the data and functions
// that are necessary to analyze and run migrations.

const moment = require('moment');
const Plugins = require('./plugins');
const MigrationPlan = require('./migration_plan');
const MigrationState = require('./migration_state');

module.exports = {
  fetch,
};

async function fetch(opts) {
  const { callCluster, log, index, initialIndex, destIndex, plugins, elasticVersion, force } = opts;
  const { migrationState, migrationStateVersion } = await MigrationState.fetch(callCluster, index);
  const sanitizedPlugins = Plugins.validate(plugins, migrationState);
  const migrationPlan = MigrationPlan.build(sanitizedPlugins, migrationState);
  return {
    index,
    callCluster,
    migrationState,
    migrationStateVersion,
    migrationPlan,
    force,
    plugins: sanitizedPlugins,
    destIndex: destIndex || `${index}-${elasticVersion}-${moment().format('YYYYMMDDHHmmss')}`,
    initialIndex: initialIndex || `${index}-${elasticVersion}-original`,
    log: migrationLogger(log),
  };
}

function migrationLogger(log) {
  const logFn = prefix => msg => log(prefix, typeof msg === 'function' ? msg() : msg);
  return {
    info: logFn(['info', 'migration']),
    debug: logFn(['debug', 'migration']),
  };
}
