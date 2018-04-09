import { fetchMigrationContext } from './migration_helpers';

/**
 * Computes the set of migrations which need to be applied.
 *
 * @param {MigrationOpts} opts
 * @returns {Promise<{ migrations: Array<{id: string, pluginId: string}> }>}
 */
export async function dryRun(opts) {
  const { migrationPlan } = await fetchMigrationContext(opts);
  return {
    migrations: migrationPlan.migrations.map(({ id, pluginId }) => ({ id, pluginId })),
  };
}
