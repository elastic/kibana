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
import { set } from '@kbn/safer-lodash-set';
import _ from 'lodash';
import Semver from 'semver';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsMigrationVersion } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectUnsanitizedDoc,
  ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';
import type { ActiveMigrations, TransformResult } from './types';
import { buildActiveMigrations } from './build_active_migrations';
import { validateMigrationDefinition } from './validate_migrations';

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
  private documentMigratorOptions: Omit<DocumentMigratorOptions, 'convertVersion'>;
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
  constructor({ typeRegistry, kibanaVersion, convertVersion, log }: DocumentMigratorOptions) {
    validateMigrationDefinition(typeRegistry, kibanaVersion, convertVersion);
    this.documentMigratorOptions = { typeRegistry, kibanaVersion, log };
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

    return Object.entries(this.migrations).reduce((acc, [prop, { latestMigrationVersion }]) => {
      // some migration objects won't have a latestMigrationVersion (they only contain reference transforms that are applied from other types)
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
    const { typeRegistry, kibanaVersion, log } = this.documentMigratorOptions;
    this.migrations = buildActiveMigrations(typeRegistry, kibanaVersion, log);
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
      const result = applyMigrations(doc, migrations, kibanaVersion, convertNamespaceTypes);
      transformedDoc = result.transformedDoc;
      additionalDocs = additionalDocs.concat(
        result.additionalDocs.map((x) => markAsUpToDate(x, migrations, kibanaVersion))
      );
    } else {
      transformedDoc = markAsUpToDate(doc, migrations, kibanaVersion);
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

  if (doc.coreMigrationVersion && Semver.gt(docVersion, kibanaVersion)) {
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
  kibanaVersion: string,
  convertNamespaceTypes: boolean
) {
  let additionalDocs: SavedObjectUnsanitizedDoc[] = [];
  while (true) {
    const prop = nextUnmigratedProp(doc, migrations);
    if (!prop) {
      // regardless of whether or not any reference transform was applied, update the coreMigrationVersion
      // this is needed to ensure that newly created documents have an up-to-date coreMigrationVersion field
      return {
        transformedDoc: { ...doc, coreMigrationVersion: kibanaVersion },
        additionalDocs,
      };
    }
    const result = migrateProp(doc, prop, migrations, convertNamespaceTypes);
    doc = result.transformedDoc;
    additionalDocs = [...additionalDocs, ...result.additionalDocs];
  }
}

/**
 * Gets the doc's props, handling the special case of "type".
 */
function props(doc: SavedObjectUnsanitizedDoc) {
  return Object.keys(doc).concat(doc.type);
}

/**
 * Looks up the prop version in a saved object document or in our latest migrations.
 */
function propVersion(doc: SavedObjectUnsanitizedDoc | ActiveMigrations, prop: string) {
  return (
    ((doc as any)[prop] && (doc as any)[prop].latestMigrationVersion) ||
    (doc.migrationVersion && (doc as any).migrationVersion[prop])
  );
}

/**
 * Sets the doc's migrationVersion to be the most recent version
 */
function markAsUpToDate(
  doc: SavedObjectUnsanitizedDoc,
  migrations: ActiveMigrations,
  kibanaVersion: string
) {
  return {
    ...doc,
    migrationVersion: props(doc).reduce((acc, prop) => {
      const version = propVersion(migrations, prop);
      return version ? set(acc, prop, version) : acc;
    }, {}),
    coreMigrationVersion: kibanaVersion,
  };
}

/**
 * Determines whether or not a document has any pending transforms that should be applied based on its coreMigrationVersion field.
 * Currently, only reference transforms qualify.
 */
function getHasPendingCoreMigrationVersionTransform(
  doc: SavedObjectUnsanitizedDoc,
  migrations: ActiveMigrations,
  prop: string
) {
  if (!migrations.hasOwnProperty(prop)) {
    return false;
  }

  const { latestCoreMigrationVersion } = migrations[prop];
  const { coreMigrationVersion } = doc;
  return (
    latestCoreMigrationVersion &&
    (!coreMigrationVersion || Semver.gt(latestCoreMigrationVersion, coreMigrationVersion))
  );
}

/**
 * Finds the first unmigrated property in the specified document.
 */
function nextUnmigratedProp(doc: SavedObjectUnsanitizedDoc, migrations: ActiveMigrations) {
  return props(doc).find((p) => {
    const latestMigrationVersion = propVersion(migrations, p);
    const docVersion = propVersion(doc, p);

    // We verify that the version is not greater than the version supported by Kibana.
    // If we didn't, this would cause an infinite loop, as we'd be unable to migrate the property
    // but it would continue to show up as unmigrated.
    // If we have a docVersion and the latestMigrationVersion is smaller than it or does not exist,
    // we are dealing with a document that belongs to a future Kibana / plugin version.
    if (docVersion && (!latestMigrationVersion || Semver.gt(docVersion, latestMigrationVersion))) {
      throw Boom.badData(
        `Document "${doc.id}" has property "${p}" which belongs to a more recent` +
          ` version of Kibana [${docVersion}]. The last known version is [${latestMigrationVersion}]`,
        doc
      );
    }

    return (
      (latestMigrationVersion && latestMigrationVersion !== docVersion) ||
      getHasPendingCoreMigrationVersionTransform(doc, migrations, p) // If the object itself is up-to-date, check if its references are up-to-date too
    );
  });
}

/**
 * Applies any relevant migrations to the document for the specified property.
 */
function migrateProp(
  doc: SavedObjectUnsanitizedDoc,
  prop: string,
  migrations: ActiveMigrations,
  convertNamespaceTypes: boolean
): TransformResult {
  const originalType = doc.type;
  let migrationVersion = _.clone(doc.migrationVersion) || {};
  let additionalDocs: SavedObjectUnsanitizedDoc[] = [];

  for (const { version, transform, transformType } of applicableTransforms(migrations, doc, prop)) {
    if (convertNamespaceTypes || (transformType !== 'convert' && transformType !== 'reference')) {
      // migrate transforms are always applied, but conversion transforms and reference transforms are only applied during index migrations
      const result = transform(doc);
      doc = result.transformedDoc;
      additionalDocs = [...additionalDocs, ...result.additionalDocs];
    }
    if (transformType === 'reference') {
      // regardless of whether or not the reference transform was applied, update the object's coreMigrationVersion
      // this is needed to ensure that we don't have an endless migration loop
      doc.coreMigrationVersion = version;
    } else {
      migrationVersion = updateMigrationVersion(doc, migrationVersion, prop, version);
      doc.migrationVersion = _.clone(migrationVersion);
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
  migrations: ActiveMigrations,
  doc: SavedObjectUnsanitizedDoc,
  prop: string
) {
  const minVersion = propVersion(doc, prop);
  const minReferenceVersion = doc.coreMigrationVersion || '0.0.0';
  const { transforms } = migrations[prop];
  return minVersion
    ? transforms.filter(({ version, transformType }) =>
        transformType === 'reference'
          ? Semver.gt(version, minReferenceVersion)
          : Semver.gt(version, minVersion)
      )
    : transforms;
}

/**
 * Updates the document's migrationVersion, ensuring that the calling transform
 * has not mutated migrationVersion in an unsupported way.
 */
function updateMigrationVersion(
  doc: SavedObjectUnsanitizedDoc,
  migrationVersion: SavedObjectsMigrationVersion,
  prop: string,
  version: string
) {
  assertNoDowngrades(doc, migrationVersion, prop, version);
  const docVersion = propVersion(doc, prop) || '0.0.0';
  const maxVersion = Semver.gt(docVersion, version) ? docVersion : version;
  return { ...(doc.migrationVersion || migrationVersion), [prop]: maxVersion };
}

/**
 * Transforms that remove or downgrade migrationVersion properties are not allowed,
 * as this could get us into an infinite loop. So, we explicitly check for that here.
 */
function assertNoDowngrades(
  doc: SavedObjectUnsanitizedDoc,
  migrationVersion: SavedObjectsMigrationVersion,
  prop: string,
  version: string
) {
  const docVersion = doc.migrationVersion;
  if (!docVersion) {
    return;
  }

  const downgrade = Object.keys(migrationVersion).find(
    (k) => !docVersion.hasOwnProperty(k) || Semver.lt(docVersion[k], migrationVersion[k])
  );

  if (downgrade) {
    throw new Error(
      `Migration "${prop} v ${version}" attempted to ` +
        `downgrade "migrationVersion.${downgrade}" from ${migrationVersion[downgrade]} ` +
        `to ${docVersion[downgrade]}.`
    );
  }
}
