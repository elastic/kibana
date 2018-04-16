const { MigrationState, MigrationContext } = require('./lib');

module.exports = {
  fetchMigrationStatus,
};

/**
 * Checks whether or not the specified index is in need of migrations.
 *
 * @param {MigrationOpts} opts
 * @returns {Promise<MigrationStatus>}
 */
async function fetchMigrationStatus(opts) {
  const { plugins, migrationState } = await MigrationContext.fetch(opts);
  return MigrationState.status(plugins, migrationState);
}
