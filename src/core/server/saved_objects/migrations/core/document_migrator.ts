/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
 * migrationVersion itself. We allow only these kinds of changes:
 *
 * - Add a new property to migrationVersion
 * - Move a migrationVersion property forward to a later version
 *
 * Migrations *cannot* move a migrationVersion property backwards (e.g. from 2.0.0 to 1.0.0), and they
 * cannot clear a migrationVersion property, as allowing either of these could produce infinite loops.
 * However, we do wish to allow migrations to modify migrationVersion if they wish, so that
 * they could transform a type from "foo 1.0.0" to  "bar 3.0.0".
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

import Boom from 'boom';
import _ from 'lodash';
import cloneDeep from 'lodash.clonedeep';
import Semver from 'semver';
import { Logger } from '../../../logging';
import { SavedObjectUnsanitizedDoc } from '../../serialization';
import { SavedObjectsMigrationVersion } from '../../types';
import { MigrationLogger } from './migration_logger';
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectMigrationFn } from '../types';

export type TransformFn = (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc;

type ValidateDoc = (doc: SavedObjectUnsanitizedDoc) => void;

interface DocumentMigratorOptions {
  kibanaVersion: string;
  typeRegistry: ISavedObjectTypeRegistry;
  validateDoc: ValidateDoc;
  log: Logger;
}

interface ActiveMigrations {
  [type: string]: {
    latestVersion: string;
    transforms: Array<{
      version: string;
      transform: TransformFn;
    }>;
  };
}

/**
 * Manages migration of individual documents.
 */
export interface VersionedTransformer {
  migrationVersion: SavedObjectsMigrationVersion;
  migrate: TransformFn;
}

/**
 * A concrete implementation of the VersionedTransformer interface.
 */
export class DocumentMigrator implements VersionedTransformer {
  private migrations: ActiveMigrations;
  private transformDoc: TransformFn;

  /**
   * Creates an instance of DocumentMigrator.
   *
   * @param {DocumentMigratorOptions} opts
   * @prop {string} kibanaVersion - The current version of Kibana
   * @prop {SavedObjectTypeRegistry} typeRegistry - The type registry to get type migrations from
   * @prop {ValidateDoc} validateDoc - A function which, given a document throws an error if it is
   *   not up to date. This is used to ensure we don't let unmigrated documents slip through.
   * @prop {Logger} log - The migration logger
   * @memberof DocumentMigrator
   */
  constructor({ typeRegistry, kibanaVersion, log, validateDoc }: DocumentMigratorOptions) {
    validateMigrationDefinition(typeRegistry);

    this.migrations = buildActiveMigrations(typeRegistry, log);
    this.transformDoc = buildDocumentTransform({
      kibanaVersion,
      migrations: this.migrations,
      validateDoc,
    });
  }

  /**
   * Gets the latest version of each migratable property.
   *
   * @readonly
   * @type {SavedObjectsMigrationVersion}
   * @memberof DocumentMigrator
   */
  public get migrationVersion(): SavedObjectsMigrationVersion {
    return _.mapValues(this.migrations, ({ latestVersion }) => latestVersion);
  }

  /**
   * Migrates a document to the latest version.
   *
   * @param {SavedObjectUnsanitizedDoc} doc
   * @returns {SavedObjectUnsanitizedDoc}
   * @memberof DocumentMigrator
   */
  public migrate = (doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc => {
    // Clone the document to prevent accidental mutations on the original data
    // Ex: Importing sample data that is cached at import level, migrations would
    // execute on mutated data the second time.
    const clonedDoc = cloneDeep(doc);
    return this.transformDoc(clonedDoc);
  };
}

/**
 * Basic validation that the migraiton definition matches our expectations. We can't
 * rely on TypeScript here, as the caller may be JavaScript / ClojureScript / any compile-to-js
 * language. So, this is just to provide a little developer-friendly error messaging. Joi was
 * giving weird errors, so we're just doing manual validation.
 */
function validateMigrationDefinition(registry: ISavedObjectTypeRegistry) {
  function assertObject(obj: any, prefix: string) {
    if (!obj || typeof obj !== 'object') {
      throw new Error(`${prefix} Got ${obj}.`);
    }
  }

  function assertValidSemver(version: string, type: string) {
    if (!Semver.valid(version)) {
      throw new Error(
        `Invalid migration for type ${type}. Expected all properties to be semvers, but got ${version}.`
      );
    }
  }

  function assertValidTransform(fn: any, version: string, type: string) {
    if (typeof fn !== 'function') {
      throw new Error(`Invalid migration ${type}.${version}: expected a function, but got ${fn}.`);
    }
  }

  registry.getAllTypes().forEach(type => {
    if (type.migrations) {
      assertObject(
        type.migrations,
        `Migration for type ${type.name} should be an object like { '2.0.0': (doc) => doc }.`
      );
      Object.entries(type.migrations).forEach(([version, fn]) => {
        assertValidSemver(version, type.name);
        assertValidTransform(fn, version, type.name);
      });
    }
  });
}

/**
 * Converts migrations from a format that is convenient for callers to a format that
 * is convenient for our internal usage:
 * From: { type: { version: fn } }
 * To:   { type: { latestVersion: string, transforms: [{ version: string, transform: fn }] } }
 */
function buildActiveMigrations(
  typeRegistry: ISavedObjectTypeRegistry,
  log: Logger
): ActiveMigrations {
  return typeRegistry
    .getAllTypes()
    .filter(type => type.migrations && Object.keys(type.migrations).length > 0)
    .reduce((migrations, type) => {
      const transforms = Object.entries(type.migrations!)
        .map(([version, transform]) => ({
          version,
          transform: wrapWithTry(version, type.name, transform, log),
        }))
        .sort((a, b) => Semver.compare(a.version, b.version));
      return {
        ...migrations,
        [type.name]: {
          latestVersion: _.last(transforms).version,
          transforms,
        },
      };
    }, {} as ActiveMigrations);
}

/**
 * Creates a function which migrates and validates any document that is passed to it.
 */
function buildDocumentTransform({
  kibanaVersion,
  migrations,
  validateDoc,
}: {
  kibanaVersion: string;
  migrations: ActiveMigrations;
  validateDoc: ValidateDoc;
}): TransformFn {
  return function transformAndValidate(doc: SavedObjectUnsanitizedDoc) {
    const result = doc.migrationVersion
      ? applyMigrations(doc, migrations)
      : markAsUpToDate(doc, migrations);

    validateDoc(result);

    // In order to keep tests a bit more stable, we won't
    // tack on an empy migrationVersion to docs that have
    // no migrations defined.
    if (_.isEmpty(result.migrationVersion)) {
      delete result.migrationVersion;
    }

    return result;
  };
}

function applyMigrations(doc: SavedObjectUnsanitizedDoc, migrations: ActiveMigrations) {
  while (true) {
    const prop = nextUnmigratedProp(doc, migrations);
    if (!prop) {
      return doc;
    }
    doc = migrateProp(doc, prop, migrations);
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
    ((doc as any)[prop] && (doc as any)[prop].latestVersion) ||
    (doc.migrationVersion && (doc as any).migrationVersion[prop])
  );
}

/**
 * Sets the doc's migrationVersion to be the most recent version
 */
function markAsUpToDate(doc: SavedObjectUnsanitizedDoc, migrations: ActiveMigrations) {
  return {
    ...doc,
    migrationVersion: props(doc).reduce((acc, prop) => {
      const version = propVersion(migrations, prop);
      return version ? _.set(acc, prop, version) : acc;
    }, {}),
  };
}

/**
 * If a specific transform function fails, this tacks on a bit of information
 * about the document and transform that caused the failure.
 */
function wrapWithTry(
  version: string,
  type: string,
  migrationFn: SavedObjectMigrationFn,
  log: Logger
) {
  return function tryTransformDoc(doc: SavedObjectUnsanitizedDoc) {
    try {
      const context = { log: new MigrationLogger(log) };
      const result = migrationFn(doc, context);

      // A basic sanity check to help migration authors detect basic errors
      // (e.g. forgetting to return the transformed doc)
      if (!result || !result.type) {
        throw new Error(`Invalid saved object returned from migration ${type}:${version}.`);
      }

      return result;
    } catch (error) {
      const failedTransform = `${type}:${version}`;
      const failedDoc = JSON.stringify(doc);
      log.warn(
        `Failed to transform document ${doc}. Transform: ${failedTransform}\nDoc: ${failedDoc}`
      );
      throw error;
    }
  };
}

/**
 * Finds the first unmigrated property in the specified document.
 */
function nextUnmigratedProp(doc: SavedObjectUnsanitizedDoc, migrations: ActiveMigrations) {
  return props(doc).find(p => {
    const latestVersion = propVersion(migrations, p);
    const docVersion = propVersion(doc, p);

    if (latestVersion === docVersion) {
      return false;
    }

    // We verify that the version is not greater than the version supported by Kibana.
    // If we didn't, this would cause an infinite loop, as we'd be unable to migrate the property
    // but it would continue to show up as unmigrated.
    // If we have a docVersion and the latestVersion is smaller than it or does not exist,
    // we are dealing with a document that belongs to a future Kibana / plugin version.
    if (docVersion && (!latestVersion || Semver.gt(docVersion, latestVersion))) {
      throw Boom.badData(
        `Document "${doc.id}" has property "${p}" which belongs to a more recent` +
          ` version of Kibana [${docVersion}]. The last known version is [${latestVersion}]`,
        doc
      );
    }

    return true;
  });
}

/**
 * Applies any relevent migrations to the document for the specified property.
 */
function migrateProp(
  doc: SavedObjectUnsanitizedDoc,
  prop: string,
  migrations: ActiveMigrations
): SavedObjectUnsanitizedDoc {
  const originalType = doc.type;
  let migrationVersion = _.clone(doc.migrationVersion) || {};
  const typeChanged = () => !doc.hasOwnProperty(prop) || doc.type !== originalType;

  for (const { version, transform } of applicableTransforms(migrations, doc, prop)) {
    doc = transform(doc);
    migrationVersion = updateMigrationVersion(doc, migrationVersion, prop, version);
    doc.migrationVersion = _.clone(migrationVersion);

    if (typeChanged()) {
      break;
    }
  }

  return doc;
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
  const { transforms } = migrations[prop];
  return minVersion
    ? transforms.filter(({ version }) => Semver.gt(version, minVersion))
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
    k => !docVersion.hasOwnProperty(k) || Semver.lt(docVersion[k], migrationVersion[k])
  );

  if (downgrade) {
    throw new Error(
      `Migration "${prop} v ${version}" attempted to ` +
        `downgrade "migrationVersion.${downgrade}" from ${migrationVersion[downgrade]} ` +
        `to ${docVersion[downgrade]}.`
    );
  }
}
