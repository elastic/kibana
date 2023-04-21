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
import { DocumentUpgradePipeline, DocumentDowngradePipeline } from './pipelines';

interface TransformOptions {
  convertNamespaceTypes?: boolean;
}

interface DocumentMigratorOptions {
  kibanaVersion: string;
  typeRegistry: ISavedObjectTypeRegistry;
  convertVersion?: string;
  log: Logger;
}

interface MigrationVersionParams {
  /**
   * Include deferred migrations in the migrationVersion.
   * @default true
   */
  includeDeferred?: boolean;

  /**
   * Migration type to use in the migrationVersion.
   * @default 'type'
   */
  migrationType?: 'core' | 'type';
}

/**
 * Manages transformations of individual documents.
 */
export interface VersionedTransformer {
  /**
   * Migrates a document to its latest version.
   */
  migrate(doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc;
  /**
   * Migrates a document to the latest version and applies type conversions if applicable.
   * Also returns any additional document(s) that may have been created during the transformation process.
   */
  migrateAndConvert(doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc[];
  /**
   * Converts a document down to the specified version.
   */
  transformDown(
    doc: SavedObjectUnsanitizedDoc,
    options: { targetTypeVersion: string }
  ): SavedObjectUnsanitizedDoc;
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
   */
  constructor(options: DocumentMigratorOptions) {
    this.options = options;
    this.migrate = (...args) => this.constructor.prototype.migrate.apply(this, args);
    this.migrateAndConvert = (...args) =>
      this.constructor.prototype.migrateAndConvert.apply(this, args);
  }

  /**
   * Gets the latest pending version of each type.
   * Some migration objects won't have a latest migration version (they only contain reference transforms that are applied from other types).
   */
  public getMigrationVersion({
    includeDeferred = true,
    migrationType = 'type',
  }: MigrationVersionParams = {}): SavedObjectsMigrationVersion {
    if (!this.migrations) {
      throw new Error('Migrations are not ready. Make sure prepareMigrations is called first.');
    }

    return Object.entries(this.migrations).reduce(
      (acc, [type, { latestVersion, immediateVersion }]) => {
        const version = includeDeferred ? latestVersion : immediateVersion;
        const latestMigrationVersion =
          migrationType === 'core' ? version.core : maxVersion(version.migrate, version.convert);

        return latestMigrationVersion ? { ...acc, [type]: latestMigrationVersion } : acc;
      },
      {}
    );
  }

  /**
   * Prepares active migrations and document transformer function.
   */
  public prepareMigrations() {
    const { typeRegistry, kibanaVersion, log, convertVersion } = this.options;
    this.migrations = buildActiveMigrations({
      typeRegistry,
      kibanaVersion,
      log,
      convertVersion,
    });
  }

  /**
   * Migrates a document to the latest version.
   */
  public migrate(doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc {
    const { document } = this.transform(doc);

    return document;
  }

  /**
   * Migrates a document to the latest version and applies type conversions if applicable. Also returns any additional document(s) that may
   * have been created during the transformation process.
   */
  public migrateAndConvert(doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc[] {
    const { document, additionalDocs } = this.transform(doc, { convertNamespaceTypes: true });

    return [document, ...additionalDocs];
  }

  public transformDown(
    doc: SavedObjectUnsanitizedDoc,
    options: { targetTypeVersion: string }
  ): SavedObjectUnsanitizedDoc {
    if (!this.migrations) {
      throw new Error('Migrations are not ready. Make sure prepareMigrations is called first.');
    }

    const pipeline = new DocumentDowngradePipeline({
      document: doc,
      typeTransforms: this.migrations[doc.type],
      kibanaVersion: this.options.kibanaVersion,
      targetTypeVersion: options.targetTypeVersion,
    });
    const { document } = pipeline.run();
    return document;
  }

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
}
