/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectUnsanitizedDoc,
  ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';
import type { ActiveMigrations } from './types';
import { maxVersion } from './pipelines/utils';
import { buildActiveMigrations } from './build_active_migrations';
import { DocumentUpgradePipeline } from './pipelines';

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
  migrate: (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc;
  migrateAndConvert: (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc[];
}

/**
 * A concrete implementation of the VersionedTransformer interface.
 */
export class DocumentMigrator implements VersionedTransformer {
  private options: DocumentMigratorOptions;
  private migrations?: ActiveMigrations;

  /**
   * Creates an instance of DocumentMigrator.
   *
   * @param {DocumentMigratorOptions} options
   * @prop {string} kibanaVersion - The current version of Kibana
   * @prop {SavedObjectTypeRegistry} typeRegistry - The type registry to get type migrations from
   * @prop {string} convertVersion - The version of Kibana in which documents can be converted to multi-namespace types
   * @prop {Logger} log - The migration logger
   * @memberof DocumentMigrator
   */
  constructor(options: DocumentMigratorOptions) {
    this.options = options;
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
    const { typeRegistry, kibanaVersion, log, convertVersion } = this.options;
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

    const pipeline = new DocumentUpgradePipeline({
      document: doc,
      migrations: this.migrations,
      kibanaVersion: this.options.kibanaVersion,
      convertNamespaceTypes,
    });
    const { document, additionalDocs } = pipeline.run();

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
