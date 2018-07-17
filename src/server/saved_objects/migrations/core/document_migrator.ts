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
 * and run the doc through those transforms.
 *
 * This way, we keep looping until there are no transforms left to apply, and we properly
 * handle property addition / deletion / renaming.
 * 
 * A caveat is that this means we can't allow transforms to modify the doc's migrationVersion.
 * If migrations were allowed to modify migrationVersion, we could get into an infinite loop,
 * so we explicitly disallow that. This means that if you *do* decide to rename a property
 * (e.g. dash -> dashboard), the document will be passed through *all* of the new property's
 * transforms (if there are any). You can't convert a document from one type to a specific version
 * of another type; only from one type to version 0 of another.
 *
 * One last gotcha is that any docs which have no migrationVersion are assumed to be up-to-date.
 * This is because Kibana UI and other clients really can't be expected build the migrationVersion
 * in a reliable way. Instead, callers of our APIs are expected to send us up-to-date documents,
 * and those documents are simply given a stamp of approval by this transformer. If the client(s)
 * send us documents with migrationVersion specified, we will migrate them as appropriate. This means
 * for data import scenarios, any documetns being imported should be explicitly given an empty
 * migrationVersion property {} if no such property exists.
*/

import _ from 'lodash';
import Semver from 'semver';
import { MigrationDefinition, MigrationVersion, SavedObjectDoc, TransformFn } from './types';

export interface IDocumentMigrator {
  migrationVersion: MigrationVersion;
  migrate: TransformFn;
}

export interface DocumentMigratorOpts {
  kibanaVersion: string;
  migrations: MigrationDefinition;
}

interface Transform {
  version: string;
  transform: TransformFn;
}

interface ActiveMigrations {
  [type: string]: { latestVersion: string; transforms: Transform[] };
}

/**
 * Manages migration of individual documents.
 */
export class DocumentMigrator implements IDocumentMigrator {
  private migrations: ActiveMigrations;
  private transformDoc: TransformFn;

  /**
   * Creates an instance of DocumentMigrator.
   *
   * @param {DocumentMigratorOpts} opts
   * @prop {string} kibanaVersion - The current version of Kibana
   * @prop {MigrationDefinition} migrations - The migrations that will be used to migrate documents
   * @memberof DocumentMigrator
   */
  constructor(opts: DocumentMigratorOpts) {
    this.migrations = buildActiveMigrations(opts.migrations);
    this.transformDoc = buildDocumentTransform({
      kibanaVersion: opts.kibanaVersion,
      migrations: this.migrations,
    });
  }

  /**
   * Gets the latest version of each migratable property.
   *
   * @readonly
   * @type {MigrationVersion}
   * @memberof DocumentMigrator
   */
  public get migrationVersion(): MigrationVersion {
    return _.mapValues(this.migrations, ({ latestVersion }) => latestVersion);
  }

  /**
   * Migrates a document to the latest version.
   *
   * @param {SavedObjectDoc} doc
   * @returns {SavedObjectDoc}
   * @memberof DocumentMigrator
   */
  public migrate = (doc: SavedObjectDoc): SavedObjectDoc => {
    return this.transformDoc(doc);
  };
}

/**
 * Converts a migration definition into a format that is more efficient for
 * transforming documents. The SortedMigrations data structure makes it really easy
 * to find out what the latestVersion of a property is, and also gives us an ordered list
 * of transforms per property so that we are guaranteed to apply transforms in the right order.
 *
 * @param {MigrationDefinition} migrations
 * @returns {SortedMigrations}
 */
function buildActiveMigrations(migrations: MigrationDefinition): ActiveMigrations {
  return _.mapValues(migrations, (versions, prop) => {
    const transforms = Object.entries(versions)
      .map(([version, transform]) => ({
        version,
        transform: wrapWithTry(version, prop!, transform),
      }))
      .sort((a, b) => Semver.compare(a.version, b.version));

    return {
      latestVersion: _.last(transforms).version,
      transforms,
    };
  });
}

/**
 * Creates a function which migrates any document that is passed to it.
 *
 * @param opts
 * @prop {string} kibanaVersion - The current version of Kibana. Docs with greater versions will be rejected.
 * @prop {MigrationDictionary} migrations - A dictionary of type -> version -> transformFunction used to migrate saved object documents
 * @returns {TransformFn}
 */
function buildDocumentTransform({
  kibanaVersion,
  migrations,
}: {
  kibanaVersion: string;
  migrations: ActiveMigrations;
}): TransformFn {
  return function transformDoc(doc: SavedObjectDoc): SavedObjectDoc {
    assertCanTransform(doc, kibanaVersion);

    // If there's no migrationVersion, we assume it is up to date.
    // This is to allow API clients to just pass us documents w/ no migrationVersion
    // when creating / updating documents. Data import and index migration logic
    // will ensure that this property exists, so those docs will be migrated.
    if (!doc.migrationVersion) {
      return markAsUpToDate(doc, migrations);
    }

    while (true) {
      const prop = nextUnmigratedProp(doc, migrations);
      if (!prop) {
        return doc;
      }
      doc = migrateProp(doc, prop, migrations);
    }
  };
}

/**
 * Sets the doc's migrationVersion to be the most recent version
 */
function markAsUpToDate(doc: SavedObjectDoc, migrations: ActiveMigrations) {
  const migrationVersion = Object.keys(doc)
    .concat(doc.type)
    .filter(prop => !!migrations[prop])
    .reduce((acc, prop) => {
      const { latestVersion } = migrations[prop];
      return _.set(acc, prop, latestVersion);
    }, {});

  return {
    ...doc,
    migrationVersion,
  };
}

/**
 * If a specific transform function fails, this tacks on a bit of information
 * about the document and transform that caused the failure.
 *
 * @param {string} version
 * @param {string} prop
 * @param {TransformFn} transform
 * @returns
 */
function wrapWithTry(version: string, prop: string, transform: TransformFn) {
  return function tryTransformDoc(doc: SavedObjectDoc) {
    try {
      return transform(doc);
    } catch (error) {
      error.detail = {
        failedDoc: `${doc.type}:${doc.id}`,
        failedTransform: `${prop}:${version}`,
      };

      throw error;
    }
  };
}

/**
 * Throws an exception if the doc has props with a later version than the current Kibana instance.
 *
 * @param {SavedObjectDoc} doc
 * @param {string} kibanaVersion
 */
function assertCanTransform(doc: SavedObjectDoc, kibanaVersion: string) {
  const { migrationVersion } = doc;
  const invalidProp =
    migrationVersion &&
    Object.keys(migrationVersion).find(prop => Semver.gt(migrationVersion[prop], kibanaVersion));

  if (invalidProp) {
    throw new Error(
      `Document ${doc.id} has property ${invalidProp} which is belongs to a` +
        ` more recent version of Kibana (${migrationVersion![invalidProp]}).`
    );
  }
}

/**
 * Finds the first unmigrated property in the specified document. Saved object documents
 * have a special case for the "type" and "attributes" property, which is the core of what
 * the document is about. All other properties are non-core properties, e.g. metadata like
 * security ACLs or migrationVersion or whatever. These non-core properties are treated generally,
 * and the type / attributes property is treated specifically.
 *
 * @param {SavedObjectDoc} doc
 * @param {ActiveMigrations} migrations
 * @returns
 */
function nextUnmigratedProp(doc: SavedObjectDoc, migrations: ActiveMigrations) {
  const isOutdatedProp = (prop: string) => {
    const latestVersion = migrations[prop] && migrations[prop].latestVersion;
    return !!latestVersion && latestVersion !== propVersion(doc, prop);
  };

  return isOutdatedProp(doc.type) ? doc.type : Object.keys(doc).find(isOutdatedProp);
}

function propVersion(doc: SavedObjectDoc, prop: string) {
  return (doc.migrationVersion && doc.migrationVersion[prop]) || '0.0.0';
}

/**
 * Applies any relevent migrations to the document for the specified property.
 *
 * @param {SavedObjectDoc} doc
 * @param {string} prop
 * @param {ActiveMigrations} migrations
 * @returns {SavedObjectDoc}
 */
function migrateProp(
  doc: SavedObjectDoc,
  prop: string,
  migrations: ActiveMigrations
): SavedObjectDoc {
  const { transforms } = migrations[prop];
  const minVersion = propVersion(doc, prop);
  const originalType = doc.type;
  let { migrationVersion = {} } = doc;

  for (const { version, transform } of transforms) {
    if (Semver.gt(version, minVersion)) {
      doc = transform(doc);

      // Safeguard against transforms overwriting migrationVersion
      migrationVersion = { ...migrationVersion, [prop]: version };
      doc.migrationVersion = migrationVersion;

      // The transform removed or renamed its property, so we won't apply
      // any further transforms to it. There likely *aren't* any further
      // transforms, but it is possible that we rename a prop foo -> bar,
      // and then a later bar transform renames it back to foo, in which
      // case, we'll pick up where we left off.
      if (!doc.hasOwnProperty(prop) || doc.type !== originalType) {
        break;
      }
    }
  }

  return doc;
}
