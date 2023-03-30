/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * This file contains logic for transforming / migrating a saved object document.
 *
 * At first, it may seem as if this could be a simple filter + reduce operation,
 * running the document through a linear set of transform functions until it is
 * up to date, but there are some edge cases that make it more complicated.
 *
 * A transform can add a new property, rename an existing property, remove a property, etc.
 * This means that we aren't able to do a reduce over a fixed list of properties, as
 * each transform operation could essentially change what transforms should be applied
 * next.
 *
 * The basic algorithm, then, is this:
 *
 * While there are any unmigrated properties in the doc, find the next unmigrated property,
 * and run the doc through the transforms that target that property.
 *
 * This way, we keep looping until there are no transforms left to apply, and we properly
 * handle property addition / deletion / renaming.
 *
 * A caveat is that this means we must restrict what a migration can do to the doc's
 * migrationVersion itself. Migrations should *not* make any changes to the migrationVersion property.
 *
 * One last gotcha is that any docs which have no migrationVersion are assumed to be up-to-date.
 * This is because Kibana UI and other clients really can't be expected build the migrationVersion
 * in a reliable way. Instead, callers of our APIs are expected to send us up-to-date documents,
 * and those documents are simply given a stamp of approval by this transformer. This is why it is
 * important for migration authors to *also* write a saved object validation that will prevent this
 * assumption from inserting out-of-date documents into the index.
 *
 * If the client(s) send us documents with migrationVersion specified, we will migrate them as
 * appropriate. This means for data import scenarios, any documetns being imported should be explicitly
 * given an empty migrationVersion property {} if no such property exists.
 */

import _ from 'lodash';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectUnsanitizedDoc,
  ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';
import type { ActiveMigrations } from './types';
import { maxVersion } from './utils';
import { buildActiveMigrations } from './build_active_migrations';
import { DocumentMigratorPipeline } from './document_migrator_pipeline';

export type MigrateFn = (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc;
export type MigrateAndConvertFn = (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc[];

interface TransformOptions {
  convertNamespaceTypes?: boolean;
}

interface DocumentMigratorOptions {
  kibanaVersion: string;
  typeRegistry: ISavedObjectTypeRegistry;
  convertVersion?: string;
  log: Logger;
}

/**
 * Manages migration of individual documents.
 */
export interface VersionedTransformer {
  migrationVersion: SavedObjectsMigrationVersion;
  migrate: MigrateFn;
  migrateAndConvert: MigrateAndConvertFn;
  prepareMigrations: () => void;
}

/**
 * A concrete implementation of the VersionedTransformer interface.
 */
export class DocumentMigrator implements VersionedTransformer {
  private documentMigratorOptions: DocumentMigratorOptions;
  private migrations?: ActiveMigrations;

  /**
   * Creates an instance of DocumentMigrator.
   *
   * @param {DocumentMigratorOptions} opts
   * @prop {string} kibanaVersion - The current version of Kibana
   * @prop {SavedObjectTypeRegistry} typeRegistry - The type registry to get type migrations from
   * @prop {string} convertVersion - The version of Kibana in which documents can be converted to multi-namespace types
   * @prop {Logger} log - The migration logger
   * @memberof DocumentMigrator
   */
  constructor(documentMigratorOptions: DocumentMigratorOptions) {
    this.documentMigratorOptions = documentMigratorOptions;
  }

  /**
   * Gets the latest version of each migrate-able property.
   *
   * @readonly
   * @type {SavedObjectsMigrationVersion}
   * @memberof DocumentMigrator
   */
  public get migrationVersion(): SavedObjectsMigrationVersion {
    if (!this.migrations) {
      throw new Error('Migrations are not ready. Make sure prepareMigrations is called first.');
    }

    return Object.entries(this.migrations).reduce((acc, [prop, { latestVersion }]) => {
      // some migration objects won't have a latest migration version (they only contain reference transforms that are applied from other types)
      const latestMigrationVersion = maxVersion(latestVersion.migrate, latestVersion.convert);
      if (latestMigrationVersion) {
        return { ...acc, [prop]: latestMigrationVersion };
      }
      return acc;
    }, {});
  }

  /**
   * Prepares active migrations and document transformer function.
   *
   * @returns {void}
   * @memberof DocumentMigrator
   */

  public prepareMigrations = () => {
    const { typeRegistry, kibanaVersion, log, convertVersion } = this.documentMigratorOptions;
    this.migrations = buildActiveMigrations({
      typeRegistry,
      kibanaVersion,
      log,
      convertVersion,
    });
  };

  private transform(
    doc: SavedObjectUnsanitizedDoc,
    { convertNamespaceTypes = false }: TransformOptions = {}
  ) {
    if (!this.migrations) {
      throw new Error('Migrations are not ready. Make sure prepareMigrations is called first.');
    }

    // Clone the document to prevent accidental mutations on the original data
    // Ex: Importing sample data that is cached at import level, migrations would
    // execute on mutated data the second time.
    const clonedDoc = _.cloneDeep(doc);
    const pipeline = new DocumentMigratorPipeline(
      clonedDoc,
      this.migrations,
      this.documentMigratorOptions.kibanaVersion,
      convertNamespaceTypes
    );
    pipeline.run();

    const { document, additionalDocs } = pipeline;

    return { document, additionalDocs };
  }

  /**
   * Migrates a document to the latest version.
   *
   * @param {SavedObjectUnsanitizedDoc} doc
   * @returns {SavedObjectUnsanitizedDoc}
   * @memberof DocumentMigrator
   */
  public migrate = (doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc => {
    const { document } = this.transform(doc);

    return document;
  };

  /**
   * Migrates a document to the latest version and applies type conversions if applicable. Also returns any additional document(s) that may
   * have been created during the transformation process.
   *
   * @param {SavedObjectUnsanitizedDoc} doc
   * @returns {SavedObjectUnsanitizedDoc}
   * @memberof DocumentMigrator
   */
  public migrateAndConvert = (doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc[] => {
    const { document, additionalDocs } = this.transform(doc, { convertNamespaceTypes: true });

    return [document, ...additionalDocs];
  };
}
