const { computeMigrationStatus, fetchMigrationContext } = require('./lib');

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
  const { plugins, migrationState } = await fetchMigrationContext(opts);
  return computeMigrationStatus(plugins, migrationState);
}
