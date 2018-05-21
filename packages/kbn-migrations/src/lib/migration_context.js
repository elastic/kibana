// The migration context object contains all of the data and functions
// that are necessary to analyze and run migrations.

const _ = require('lodash');
const objectHash = require('./object_hash');
const MigrationPlan = require('./migration_plan');
const MigrationState = require('./migration_state');
const Persistence = require('./persistence');

module.exports = {
  fetch,
};

async function fetch(opts) {
  const { callCluster, log, index, plugins, elasticVersion, force } = opts;
  const initialIndex = sanitizeIndexName(`${index}-${elasticVersion}-original`);
  const [currentIndex, { migrationState, migrationStateVersion }, currentMappings] = await Promise.all([
    Persistence.getCurrentIndex(callCluster, index),
    MigrationState.fetch(callCluster, index),
    Persistence.getMapping(callCluster, index),
  ]);
  const migrationPlan = MigrationPlan.build(plugins, migrationState, currentMappings);
  const nextMigrationState = MigrationState.build(plugins, currentIndex || initialIndex, migrationState);
  const status = MigrationState.status(nextMigrationState, migrationState);
  const sha = objectHash(_.map(nextMigrationState.types, 'checksum'));

  return {
    status,
    index,
    callCluster,
    migrationState,
    migrationStateVersion,
    nextMigrationState,
    migrationPlan,
    force,
    initialIndex,
    plugins,
    destIndex: sanitizeIndexName(`${index}-${elasticVersion}-${sha}`),
    log: log ? migrationLogger(log) : _.noop,
  };
}

function sanitizeIndexName(indexName) {
  return indexName.toLowerCase();
}

function migrationLogger(log) {
  const logFn = prefix => msg => log(prefix, typeof msg === 'function' ? msg() : msg);
  return {
    info: logFn(['info', 'migration']),
    debug: logFn(['debug', 'migration']),
    error: logFn(['error', 'migration']),
  };
}
