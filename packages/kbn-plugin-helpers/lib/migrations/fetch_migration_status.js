import { computeMigrationStatus, fetchMigrationContext } from './migration_helpers';

/**
 * Checks whether or not the specified index is in need of migrations.
 *
 * @param {MigrationOpts} opts
 * @returns {Promise<MigrationStatus>}
 */
export async function fetchMigrationStatus(opts) {
  const { plugins, migrationState } = await fetchMigrationContext(opts);
  return computeMigrationStatus(plugins, migrationState);
}
