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

import Boom from '@hapi/boom';
import _ from 'lodash';
import Semver from 'semver';
import type { Logger } from '@kbn/logging';
import type {
  SavedObjectUnsanitizedDoc,
  ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsMigrationVersion } from '../initial_state';
import type { ActiveMigrations, TransformResult } from './types';
import { maxVersion } from './utils';
import { buildActiveMigrations } from './build_active_migrations';

export type MigrateFn = (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc;
export type MigrateAndConvertFn = (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc[];

type ApplyTransformsFn = (
  doc: SavedObjectUnsanitizedDoc,
  options?: TransformOptions
) => TransformResult;

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
  private transformDoc?: ApplyTransformsFn;

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
    this.transformDoc = buildDocumentTransform({
      kibanaVersion,
      migrations: this.migrations,
    });
  };

  /**
   * Migrates a document to the latest version.
   *
   * @param {SavedObjectUnsanitizedDoc} doc
   * @returns {SavedObjectUnsanitizedDoc}
   * @memberof DocumentMigrator
   */
  public migrate = (doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc => {
    if (!this.migrations || !this.transformDoc) {
      throw new Error('Migrations are not ready. Make sure prepareMigrations is called first.');
    }

    // Clone the document to prevent accidental mutations on the original data
    // Ex: Importing sample data that is cached at import level, migrations would
    // execute on mutated data the second time.
    const clonedDoc = _.cloneDeep(doc);
    const { transformedDoc } = this.transformDoc(clonedDoc);
    return transformedDoc;
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
    if (!this.migrations || !this.transformDoc) {
      throw new Error('Migrations are not ready. Make sure prepareMigrations is called first.');
    }

    // Clone the document to prevent accidental mutations on the original data
    // Ex: Importing sample data that is cached at import level, migrations would
    // execute on mutated data the second time.
    const clonedDoc = _.cloneDeep(doc);
    const { transformedDoc, additionalDocs } = this.transformDoc(clonedDoc, {
      convertNamespaceTypes: true,
    });
    return [transformedDoc, ...additionalDocs];
  };
}

/**
 * Creates a function which migrates and validates any document that is passed to it.
 */
function buildDocumentTransform({
  kibanaVersion,
  migrations,
}: {
  kibanaVersion: string;
  migrations: ActiveMigrations;
}): ApplyTransformsFn {
  return function transformAndValidate(
    doc: SavedObjectUnsanitizedDoc,
    options: TransformOptions = {}
  ) {
    validateCoreMigrationVersion(doc, kibanaVersion);

    const { convertNamespaceTypes = false } = options;
    let transformedDoc: SavedObjectUnsanitizedDoc;
    let additionalDocs: SavedObjectUnsanitizedDoc[] = [];
    if (doc.migrationVersion) {
      const result = applyMigrations(doc, migrations, convertNamespaceTypes);
      transformedDoc = result.transformedDoc;
      additionalDocs = additionalDocs.concat(
        result.additionalDocs.map((x) => markAsUpToDate(x, migrations))
      );
    } else {
      transformedDoc = markAsUpToDate(doc, migrations);
    }

    // In order to keep tests a bit more stable, we won't
    // tack on an empty migrationVersion to docs that have
    // no migrations defined.
    if (_.isEmpty(transformedDoc.migrationVersion)) {
      delete transformedDoc.migrationVersion;
    }

    return { transformedDoc, additionalDocs };
  };
}

function validateCoreMigrationVersion(doc: SavedObjectUnsanitizedDoc, kibanaVersion: string) {
  const { id, coreMigrationVersion: docVersion } = doc;
  if (!docVersion) {
    return;
  }

  // We verify that the object's coreMigrationVersion is valid, and that it is not greater than the version supported by Kibana.
  // If we have a coreMigrationVersion and the kibanaVersion is smaller than it or does not exist, we are dealing with a document that
  // belongs to a future Kibana / plugin version.
  if (!Semver.valid(docVersion)) {
    throw Boom.badData(
      `Document "${id}" has an invalid "coreMigrationVersion" [${docVersion}]. This must be a semver value.`,
      doc
    );
  }

  if (docVersion && Semver.gt(docVersion, kibanaVersion)) {
    throw Boom.badData(
      `Document "${id}" has a "coreMigrationVersion" which belongs to a more recent version` +
        ` of Kibana [${docVersion}]. The current version is [${kibanaVersion}].`,
      doc
    );
  }
}

function applyMigrations(
  doc: SavedObjectUnsanitizedDoc,
  migrations: ActiveMigrations,
  convertNamespaceTypes: boolean
) {
  let additionalDocs: SavedObjectUnsanitizedDoc[] = [];
  // while (hasPendingMigration(doc, migrations) || hasPendingCoreMigration(doc, migrations)) {
  //   const result = migrate(doc, migrations, convertNamespaceTypes);
  while (hasPendingMigrationTransform(doc, migrations) ||
    (convertNamespaceTypes && // If the object itself is up-to-date, check if its references are up-to-date too
      (hasPendingCoreTransform(doc, migrations) || hasPendingConversionTransform(doc, migrations)))) {
    const result = migrate(doc, migrations, convertNamespaceTypes);
    doc = result.transformedDoc;
    additionalDocs = [...additionalDocs, ...result.additionalDocs];
  }

  const { coreMigrationVersion = getLatestCoreVersion(doc, migrations), ...transformedDoc } =
    doc;

  return {
    transformedDoc: {
      ...transformedDoc,
      ...(coreMigrationVersion ? { coreMigrationVersion } : {}),
    },
    additionalDocs,
  };
}

/**
 * Sets the doc's migrationVersion to be the most recent version
 */
function markAsUpToDate(doc: SavedObjectUnsanitizedDoc, migrations: ActiveMigrations) {
  const { coreMigrationVersion = getLatestCoreVersion(doc, migrations), migrationVersion: previousMigrationVersion, ...rest } = doc;
  const migrationVersion = maxVersion(
    migrations[doc.type]?.latestVersion.migrate,
    migrations[doc.type]?.latestVersion.convert
  );

  return {
    ...rest,
    ...(migrationVersion ? { migrationVersion } : {}),
    ...(coreMigrationVersion ? { coreMigrationVersion } : {}),
  };
}

/**
 * Determines whether or not a document has any pending transforms that should be applied based on its coreMigrationVersion field.
 * Currently, only reference transforms qualify.
 */
function hasPendingCoreTransform(
  { coreMigrationVersion: currentVersion, type }: SavedObjectUnsanitizedDoc,
  migrations: ActiveMigrations
) {
  const latestVersion = migrations[type]?.latestVersion.reference;

  return !!latestVersion && (!currentVersion || Semver.gt(latestVersion, currentVersion));
}

/**
 * Determines whether or not a document has any pending conversion transforms that should be applied.
 * Currently, only reference transforms qualify.
 */
function hasPendingConversionTransform(
  { migrationVersion: currentVersion, type }: SavedObjectUnsanitizedDoc,
  migrations: ActiveMigrations
) {
  const latestVersion = migrations[type]?.latestVersion.convert;

  return !!latestVersion && (!currentVersion || Semver.gt(latestVersion, currentVersion));
}

/**
 * Determines whether or not a document has any pending transforms that should be applied based on its coreMigrationVersion field.
 * Currently, only reference transforms qualify.
 */
function hasPendingMigrationTransform(
  { migrationVersion: currentVersion, type }: SavedObjectUnsanitizedDoc,
  migrations: ActiveMigrations,
) {
  const latestVersion = migrations[type]?.latestVersion.migrate;

  return !!latestVersion && (!currentVersion || Semver.gt(latestVersion, currentVersion));
}

function getLatestCoreVersion({ type }: SavedObjectUnsanitizedDoc, migrations: ActiveMigrations) {
  return migrations[type]?.latestVersion.reference;
}

/**
 * Applies any relevant migrations to the document for the specified property.
 */
function migrate(
  doc: SavedObjectUnsanitizedDoc,
  migrations: ActiveMigrations,
  convertNamespaceTypes: boolean
): TransformResult {
  const originalType = doc.type;
  let additionalDocs: SavedObjectUnsanitizedDoc[] = [];

  for (const { version, transform, transformType } of applicableTransforms(
    doc,
    migrations,
    convertNamespaceTypes
  )) {
    if (transformType !== 'reference') {
      assertCompatibility(doc, migrations);
    }

    const previousMigrationVersion = doc.migrationVersion;
    const result = transform(doc);
    doc = result.transformedDoc;
    additionalDocs = [...additionalDocs, ...result.additionalDocs];

    if (transformType === 'reference') {
      // regardless of whether or not the reference transform was applied, update the object's coreMigrationVersion
      // this is needed to ensure that we don't have an endless migration loop
      doc.coreMigrationVersion = version;
    } else {
      assertNoDowngrades(doc, previousMigrationVersion, version);
      doc.migrationVersion = maxVersion(doc.migrationVersion, version);
    }

    if (doc.type !== originalType) {
      // the transform function changed the object's type; break out of the loop
      break;
    }
  }

  return { transformedDoc: doc, additionalDocs };
}

/**
 * Retrieves any prop transforms that have not been applied to doc.
 */
function applicableTransforms(
  doc: SavedObjectUnsanitizedDoc,
  migrations: ActiveMigrations,
  convertNamespaceTypes: boolean
) {
  const minMigrationVersion = doc.migrationVersion;
  const minCoreMigrationVersion = doc.coreMigrationVersion || '0.0.0';
  const { transforms } = migrations[doc.type];

  return transforms
    .filter(
      ({ transformType }) =>
        convertNamespaceTypes || !['convert', 'reference'].includes(transformType)
    )
    .filter(
      ({ transformType, version }) =>
        !minMigrationVersion ||
        Semver.gt(
          version,
          transformType === 'reference' ? minCoreMigrationVersion : minMigrationVersion
        )
    );
}

/**
 * Transforms that remove or downgrade migrationVersion properties are not allowed,
 * as this could get us into an infinite loop. So, we explicitly check for that here.
 */
function assertNoDowngrades(
  { type, migrationVersion: targetVersion }: SavedObjectUnsanitizedDoc,
  sourceVersion: string | undefined,
  version: string
) {
  if (!targetVersion || !sourceVersion) {
    return;
  }

  if (Semver.lt(targetVersion, sourceVersion)) {
    throw new Error(
      `Migration "${type} v${version}" attempted to ` +
        `downgrade "migrationVersion" from ${sourceVersion} ` +
        `to ${targetVersion}.`
    );
  }
}

function assertCompatibility(
  doc: SavedObjectUnsanitizedDoc,
  migrations: ActiveMigrations,
) {
  const { id, type, migrationVersion: currentMigrationVersion } = doc;
  const latestMigrationVersion = maxVersion(
    migrations[type]?.latestVersion.migrate,
    migrations[type]?.latestVersion.convert
  );

  // We verify that the version is not greater than the version supported by Kibana.
  // If we didn't, this would cause an infinite loop, as we'd be unable to migrate the property
  // but it would continue to show up as unmigrated.
  // If we have a docVersion and the latestMigrationVersion is smaller than it or does not exist,
  // we are dealing with a document that belongs to a future Kibana / plugin version.
  if (currentMigrationVersion && (!latestMigrationVersion || Semver.gt(currentMigrationVersion, latestMigrationVersion))) {
    throw Boom.badData(
      `Document "${id}" belongs to a more recent` +
        ` version of Kibana [${currentMigrationVersion}]. The last known version is [${latestMigrationVersion}]`,
      doc
    );
  }
}
