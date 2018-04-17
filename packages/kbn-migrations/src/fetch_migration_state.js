const { MigrationState, Opts } = require('./lib');

module.exports = {
  fetchMigrationState,
};

const optsDefinition = {
  callCluster: 'function',
  index: 'string',
};

/**
 * Gets the currently stored migration state for the specified index.
 *
 * @param {MigrationOpts} opts
 * @returns {Promise<MigrationStatus>}
 */
async function fetchMigrationState(opts) {
  const { callCluster, index } = Opts.validate(optsDefinition, opts);
  const { migrationState } = await MigrationState.fetch(callCluster, index);
  return migrationState;
}
