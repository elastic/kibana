/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';
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
import { downgradeRequired } from './utils';
import { TransformType } from './types';

/**
 * Options for {@link VersionedTransformer.migrate}
 */
export interface DocumentMigrateOptions {
  /**
   * Defines whether it is allowed to convert documents from an higher version or not.
   * - If `true`, documents from higher versions will go though the downgrade pipeline.
   * - If `false`, an error will be thrown when trying to process a document with an higher type version.
   * Defaults to `false`.
   */
  allowDowngrade?: boolean;
}

interface TransformOptions {
  convertNamespaceTypes?: boolean;
  allowDowngrade?: boolean;
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
  migrate(
    doc: SavedObjectUnsanitizedDoc,
    options?: DocumentMigrateOptions
  ): SavedObjectUnsanitizedDoc;

  /**
   * Migrates a document to the latest version and applies type conversions if applicable.
   * Also returns any additional document(s) that may have been created during the transformation process.
   *
   * @remark This only be used by the savedObject migration during upgrade. For all other scenarios,
   *         {@link VersionedTransformer#migrate} should be used instead.
   */
  migrateAndConvert(doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc[];
}

/**
 * A concrete implementation of the {@link VersionedTransformer} interface.
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

    return Object.entries(this.migrations).reduce<SavedObjectsMigrationVersion>(
      (acc, [type, { latestVersion, immediateVersion }]) => {
        const version = includeDeferred ? latestVersion : immediateVersion;
        const latestMigrationVersion =
          migrationType === 'core' ? version.core : maxVersion(version.migrate, version.convert);

        if (latestMigrationVersion) {
          acc[type] = latestMigrationVersion;
        }
        return acc;
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
  public migrate(
    doc: SavedObjectUnsanitizedDoc,
    { allowDowngrade = false }: DocumentMigrateOptions = {}
  ): SavedObjectUnsanitizedDoc {
    const { document } = this.transform(doc, {
      allowDowngrade,
    });
    return document;
  }

  /**
   * Migrates a document to the latest version and applies type conversions if applicable. Also returns any additional document(s) that may
   * have been created during the transformation process.
   */
  public migrateAndConvert(doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc[] {
    const { document, additionalDocs } = this.transform(doc, {
      convertNamespaceTypes: true,
      allowDowngrade: false,
    });
    return [document, ...additionalDocs];
  }

  private transform(
    doc: SavedObjectUnsanitizedDoc,
    { convertNamespaceTypes = false, allowDowngrade = false }: TransformOptions = {}
  ) {
    if (!this.migrations) {
      throw new Error('Migrations are not ready. Make sure prepareMigrations is called first.');
    }
    const typeMigrations = this.migrations[doc.type];
    if (downgradeRequired(doc, typeMigrations?.latestVersion ?? {})) {
      const currentVersion = doc.typeMigrationVersion ?? doc.migrationVersion?.[doc.type];
      const latestVersion = this.migrations[doc.type].latestVersion[TransformType.Migrate];
      if (!allowDowngrade) {
        throw Boom.badData(
          `Document "${doc.id}" belongs to a more recent version of Kibana [${currentVersion}] when the last known version is [${latestVersion}].`
        );
      }
      return this.transformDown(doc, { targetTypeVersion: latestVersion! });
    } else {
      return this.transformUp(doc, { convertNamespaceTypes });
    }
  }

  private transformUp(
    doc: SavedObjectUnsanitizedDoc,
    { convertNamespaceTypes }: { convertNamespaceTypes: boolean }
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

  private transformDown = (
    doc: SavedObjectUnsanitizedDoc,
    { targetTypeVersion }: { targetTypeVersion: string }
  ) => {
    if (!this.migrations) {
      throw new Error('Migrations are not ready. Make sure prepareMigrations is called first.');
    }

    const pipeline = new DocumentDowngradePipeline({
      document: doc,
      targetTypeVersion,
      typeTransforms: this.migrations[doc.type],
      kibanaVersion: this.options.kibanaVersion,
    });
    const { document } = pipeline.run();
    const additionalDocs: SavedObjectUnsanitizedDoc[] = [];
    return { document, additionalDocs };
  };
}
