const { MigrationState, MigrationContext, Opts } = require('./lib');

module.exports = {
  fetchMigrationStatus,
};

const optsDefinition = {
  callCluster: 'function',
  index: 'string',
  plugins: 'array',
};

/**
 * Checks whether or not the specified index is in need of migrations.
 *
 * @param {MigrationOpts} opts
 * @returns {Promise<MigrationStatus>}
 */
async function fetchMigrationStatus(opts) {
  const { plugins, migrationState } = await MigrationContext.fetch(Opts.validate(optsDefinition, opts));
  return MigrationState.status(plugins, migrationState);
}
