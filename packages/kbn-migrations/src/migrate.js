// The primary logic for applying migrations to an index
const moment = require('moment');
const {
  buildMigrationState,
  convertIndexToAlias,
  setReadonly,
  cloneIndexSettings,
  applySeeds,
  applyTransforms,
  saveMigrationState,
  setAlias,
  MigrationStatus,
  aliasExists,
  indexExists,
  createIndex,
  fetchMigrationContext,
  computeMigrationStatus,
} = require('./lib');

module.exports = {
  migrate,
};

/**
 * @typedef {elapsedMs: number, index: string, destIndex: string, status: MigrationStatus} MigrationResult
*/

/**
 * Performs a migration of the specified index using the migrations defined by
 * the specified plugins.
 * @param {MigrationOpts} opts
 * @returns {MigrationResult}
 */
async function migrate(opts) {
  const { result, elapsedMs } = await measureElapsedTime(() => runMigrationIfOutOfDate(opts));
  return {
    ...result,
    elapsedMs
  };
}

async function measureElapsedTime(fn) {
  const startTime = moment();
  const result = await fn();
  return {
    result,
    elapsedMs: moment().diff(startTime, 'ms'),
  };
}

async function runMigrationIfOutOfDate(opts) {
  const context = await fetchMigrationContext(opts);
  const status = await computeMigrationStatus(context.plugins, context.migrationState);

  if (status !== MigrationStatus.outOfDate) {
    return skipMigration(context, status);
  } else {
    return runMigration(context);
  }
}

function skipMigration({ index, log }, status) {
  log.info(() => `Skipping migration of "${index}" because the index has status ${status}.`);
  return {
    index,
    status,
    destIndex: index,
  };
}

async function runMigration(context) {
  const {
    index,
    callCluster,
    log,
    plugins,
    migrationState,
    migrationPlan,
    scrollSize,
  } = context;

  log.info(() => `Preparing to migrate "${index}"`);
  log.debug(() => `Migrations being applied: ${migrationPlan.migrations.map(({ id }) => id).join(', ')}`);
  const { targetIndex, isNew } = await initializeMigration(context);

  log.info(() => `Seeding ${targetIndex}`);
  await applySeeds(callCluster, log, targetIndex, migrationPlan.migrations);

  if (!isNew) {
    log.info(() => `Transforming ${index} into ${targetIndex}`);
    await applyTransforms(callCluster, log, index, targetIndex, migrationPlan.migrations, scrollSize);
  }

  log.info(() => `Saving migration state to ${targetIndex}`);
  await saveMigrationState(callCluster, targetIndex, undefined, buildMigrationState(plugins, migrationState));

  log.info(() => `Pointing alias ${index} to ${targetIndex}`);
  await setAlias(callCluster, index, targetIndex);

  return {
    index,
    destIndex: targetIndex,
    status: MigrationStatus.migrated,
  };
}

async function initializeMigration(context) {
  const { callCluster, index } = context;
  const exists = await indexExists(callCluster, index);
  return exists ? initializeExistingIndex(context) : initializeNewIndex(context);
}

async function initializeNewIndex({ log, initialIndex, callCluster, migrationPlan: { mappings } }) {
  log.info(() => `Creating index ${initialIndex}`);
  await createIndex(callCluster, initialIndex, mappings);
  return { targetIndex: initialIndex, isNew: true };
}

async function initializeExistingIndex(context) {
  const { log, index, callCluster, migrationStateVersion, migrationState, destIndex, migrationPlan: { mappings } } = context;
  log.info(() => `Marking index ${index} as migrating`);
  await saveMigrationState(callCluster, index, migrationStateVersion, {
    ...migrationState,
    status: MigrationStatus.migrating,
  });

  await ensureIsAliased(context);

  log.info(() => `Setting index ${index} to read-only`);
  await setReadonly(callCluster, index, true);

  log.info(() => `Creating index ${destIndex}`);
  await cloneIndexSettings(callCluster, index, destIndex, mappings);

  return {
    targetIndex: destIndex,
    isNew: false,
  };
}

async function ensureIsAliased({ callCluster, index, initialIndex, log }) {
  const isAlias = await aliasExists(callCluster, index);
  if (!isAlias) {
    log.info(() => `Converting index ${index} to an alias`);
    await convertIndexToAlias(callCluster, index, initialIndex);
  }
}
