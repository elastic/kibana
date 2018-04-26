// The primary logic for applying migrations to an index
const { MigrationState, MigrationStatus, Persistence, MigrationContext, Opts } = require('./lib');

module.exports = {
  migrate,
};

const optsDefinition = {
  callCluster: 'function',
  index: 'string',
  plugins: 'array',
  log: 'function',
  elasticVersion: 'string',
  force: ['undefined', 'boolean'],
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
  const startTime = Date.now();
  const result = await fn();
  return {
    result,
    elapsedMs: Date.now() - startTime,
  };
}

async function runMigrationIfOutOfDate(opts) {
  const context = await MigrationContext.fetch(Opts.validate(optsDefinition, opts));
  const status = await MigrationState.status(context.plugins, context.migrationState);

  if (status !== MigrationStatus.outOfDate && !context.force) {
    return skipMigration(context, status);
  } else {
    return runMigration(context);
  }
}

function skipMigration({ index }, status) {
  return {
    index,
    status,
    destIndex: index,
    skippedMigration: true,
  };
}

async function runMigration(context) {
  const {
    index,
    callCluster,
    log,
    migrationState,
    migrationStateVersion,
    nextMigrationState,
    migrationPlan,
    scrollSize,
    destIndex,
  } = context;

  log.info(() => `Preparing to migrate "${index}"`);
  log.debug(() => `Migrations being applied: ${migrationPlan.migrations.map(({ id }) => id).join(', ')}`);

  await ensureIndexExists(context);

  log.info(() => `Marking index ${index} as migrating`);
  await MigrationState.save(callCluster, index, migrationStateVersion, {
    ...migrationState,
    status: MigrationStatus.migrating,
  });

  await ensureIsAliased(context);

  log.info(() => `Setting index ${index} to read-only`);
  await Persistence.setReadonly(callCluster, index, true);

  log.info(() => `Creating index ${destIndex}`);
  await Persistence.cloneIndexSettings(callCluster, index, destIndex, migrationPlan.mappings);

  log.info(() => `Seeding ${destIndex}`);
  await Persistence.applySeeds(callCluster, log, destIndex, migrationPlan.migrations);

  log.info(() => `Transforming ${index} into ${destIndex}`);
  await Persistence.applyTransforms(callCluster, log, index, destIndex, migrationPlan.migrations, scrollSize);

  log.info(() => `Saving migration state to ${destIndex}`);
  await MigrationState.save(callCluster, destIndex, undefined, nextMigrationState);

  log.info(() => `Pointing alias ${index} to ${destIndex}`);
  await Persistence.setAlias(callCluster, index, destIndex);

  return {
    index,
    destIndex,
    status: MigrationStatus.migrated,
  };
}

async function ensureIndexExists({ log, index, initialIndex, callCluster, migrationPlan: { mappings } }) {
  const exists = await Persistence.indexExists(callCluster, index);
  if (!exists) {
    log.info(() => `Creating index ${initialIndex}`);
    await Persistence.createIndex(callCluster, initialIndex, {
      mappings,
      aliases: {
        [index]: {},
      },
      settings: {
        index: {
          number_of_replicas: '1',
          number_of_shards: '5',
        },
      },
    });
  }
}

async function ensureIsAliased({ callCluster, index, initialIndex, log }) {
  const isAlias = await Persistence.aliasExists(callCluster, index);
  if (!isAlias) {
    log.info(() => `Converting index ${index} to an alias`);
    await Persistence.convertIndexToAlias(callCluster, index, initialIndex);
  }
}
