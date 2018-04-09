import { computeMigrationStatus, fetchMigrationState, sanitizePlugins } from './migration_helpers';

/**
 * @typedef {'migrating' | 'migrated' | 'outOfDate'} MigrationStatus
*/

/**
 * Checks whether or not the specified index is in need of migrations.
 *
 * @param {MigrationOpts} opts
 * @returns {Promise<MigrationStatus>}
 */
export async function fetchMigrationStatus({ callCluster, index, plugins }) {
  const { migrationState } = await fetchMigrationState(callCluster, index);
  return computeMigrationStatus(sanitizePlugins(plugins), migrationState);
}
