// The migration context object contains all of the data and functions
// that are necessary to analyze and run migrations.

const moment = require('moment');
const { validatePlugins } = require('./plugins');
const { buildMigrationPlan } = require('./migration_plan');
const { fetchMigrationState } = require('./persistence');

module.exports = {
  fetchMigrationContext,
};

async function fetchMigrationContext(opts) {
  const { server, index, initialIndex, destIndex, plugins } = validateOpts(opts);
  const callCluster = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
  const { migrationState, migrationStateVersion } = await fetchMigrationState(callCluster, index);
  const sanitizedPlugins = validatePlugins(plugins, migrationState);
  const migrationPlan = buildMigrationPlan(sanitizedPlugins, migrationState);
  return {
    index,
    callCluster,
    migrationState,
    migrationStateVersion,
    migrationPlan,
    plugins: sanitizedPlugins,
    destIndex: destIndex || `${index}-${moment().format('YYYYMMDDHHmmss')}`,
    initialIndex: initialIndex || `${index}-original`,
    log: migrationLogger(server),
  };
}

// Validates the MigrationOpts argument which is passed to all public / exported migration
// functions. This should provide devs who consume migrations with friendly diagnostic errors
// if they fail to pass the correct arguments.
function validateOpts(opts) {
  function validateProp(prop, type, isValid) {
    const value = opts[prop];
    isValid = isValid || (() => typeof value === type);
    if (!isValid(value)) {
      throw new Error(`MigrationOpts: property ${prop} must be a ${type}. Got ${typeof value}: ${value}`);
    }
  }

  validateProp('index', 'string');
  validateProp('server', 'object');
  validateProp('plugins', 'array', (v) => Array.isArray(v));
  validateProp('destIndex', 'string', (v) => v === undefined || typeof v === 'string');
  validateProp('initialIndex', 'string', (v) => v === undefined || typeof v === 'string');

  return opts;
}

function migrationLogger(server) {
  const logFn = prefix => msg => server.log(prefix, typeof msg === 'function' ? msg() : msg);
  return {
    info: logFn(['info', 'migration']),
    debug: logFn(['debug', 'migration']),
  };
}
