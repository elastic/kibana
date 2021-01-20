/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { diffMappings } from './build_active_mappings';
import * as Index from './elastic_index';
import { migrateRawDocs } from './migrate_raw_docs';
import { Context, migrationContext, MigrationOpts } from './migration_context';
import { coordinateMigration, MigrationResult } from './migration_coordinator';

/*
 * Core logic for migrating the mappings and documents in an index.
 */
export class IndexMigrator {
  private opts: MigrationOpts;

  /**
   * Creates an instance of IndexMigrator.
   *
   * @param {MigrationOpts} opts
   */
  constructor(opts: MigrationOpts) {
    this.opts = opts;
  }

  /**
   * Migrates the index, or, if another Kibana instance appears to be running the migration,
   * waits for the migration to complete.
   *
   * @returns {Promise<MigrationResult>}
   */
  public async migrate(): Promise<MigrationResult> {
    const context = await migrationContext(this.opts);

    return coordinateMigration({
      log: context.log,

      pollInterval: context.pollInterval,

      async isMigrated() {
        return !(await requiresMigration(context));
      },

      async runMigration() {
        if (await requiresMigration(context)) {
          return migrateIndex(context);
        }

        return { status: 'skipped' };
      },
    });
  }
}

/**
 * Determines what action the migration system needs to take (none, patch, migrate).
 */
async function requiresMigration(context: Context): Promise<boolean> {
  const { client, alias, documentMigrator, dest, log } = context;

  // Have all of our known migrations been run against the index?
  const hasMigrations = await Index.migrationsUpToDate(
    client,
    alias,
    documentMigrator.migrationVersion
  );

  if (!hasMigrations) {
    return true;
  }

  // Is our index aliased?
  const refreshedSource = await Index.fetchInfo(client, alias);

  if (!refreshedSource.aliases[alias]) {
    return true;
  }

  // Do the actual index mappings match our expectations?
  const diffResult = diffMappings(refreshedSource.mappings, dest.mappings);

  if (diffResult) {
    log.info(`Detected mapping change in "${diffResult.changedProp}"`);

    return true;
  }

  return false;
}

/**
 * Performs an index migration if the source index exists, otherwise
 * this simply creates the dest index with the proper mappings.
 */
async function migrateIndex(context: Context): Promise<MigrationResult> {
  const startTime = Date.now();
  const { client, alias, source, dest, log } = context;

  await deleteIndexTemplates(context);

  log.info(`Creating index ${dest.indexName}.`);

  await Index.createIndex(client, dest.indexName, dest.mappings);

  await migrateSourceToDest(context);

  log.info(`Pointing alias ${alias} to ${dest.indexName}.`);

  await Index.claimAlias(client, dest.indexName, alias);

  const result: MigrationResult = {
    status: 'migrated',
    destIndex: dest.indexName,
    sourceIndex: source.indexName,
    elapsedMs: Date.now() - startTime,
  };

  log.info(`Finished in ${result.elapsedMs}ms.`);

  return result;
}

/**
 * If the obsoleteIndexTemplatePattern option is specified, this will delete any index templates
 * that match it.
 */
async function deleteIndexTemplates({ client, log, obsoleteIndexTemplatePattern }: Context) {
  if (!obsoleteIndexTemplatePattern) {
    return;
  }

  const { body: templates } = await client.cat.templates<Array<{ name: string }>>({
    format: 'json',
    name: obsoleteIndexTemplatePattern,
  });

  if (!templates.length) {
    return;
  }

  const templateNames = templates.map((t) => t.name);

  log.info(`Removing index templates: ${templateNames}`);

  return Promise.all(templateNames.map((name) => client.indices.deleteTemplate({ name })));
}

/**
 * Moves all docs from sourceIndex to destIndex, migrating each as necessary.
 * This moves documents from the concrete index, rather than the alias, to prevent
 * a situation where the alias moves out from under us as we're migrating docs.
 */
async function migrateSourceToDest(context: Context) {
  const { client, alias, dest, source, batchSize } = context;
  const { scrollDuration, documentMigrator, log, serializer } = context;

  if (!source.exists) {
    return;
  }

  if (!source.aliases[alias]) {
    log.info(`Reindexing ${alias} to ${source.indexName}`);

    await Index.convertToAlias(client, source, alias, batchSize, context.convertToAliasScript);
  }

  const read = Index.reader(client, source.indexName, { batchSize, scrollDuration });

  log.info(`Migrating ${source.indexName} saved objects to ${dest.indexName}`);

  while (true) {
    const docs = await read();

    if (!docs || !docs.length) {
      return;
    }

    log.debug(`Migrating saved objects ${docs.map((d) => d._id).join(', ')}`);

    await Index.write(
      client,
      dest.indexName,
      await migrateRawDocs(serializer, documentMigrator.migrate, docs, log)
    );
  }
}
