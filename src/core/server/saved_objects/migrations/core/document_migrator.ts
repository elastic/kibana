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

import Boom from '@hapi/boom';
import uuidv5 from 'uuid/v5';
import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';
import Semver from 'semver';
import { Logger } from '../../../logging';
import { SavedObjectUnsanitizedDoc } from '../../serialization';
import { SavedObjectsMigrationVersion, SavedObjectsType } from '../../types';
import { MigrationLogger } from './migration_logger';
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectMigrationFn } from '../types';
import { DEFAULT_NAMESPACE_STRING } from '../../service/lib/utils';
import { LegacyUrlAlias, LEGACY_URL_ALIAS_TYPE } from '../../object_types';

export type MigrateFn = (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc;
export type MigrateAndConvertFn = (doc: SavedObjectUnsanitizedDoc) => SavedObjectUnsanitizedDoc[];

interface TransformResult {
  /**
   * This is the original document that has been transformed.
   */
  transformedDoc: SavedObjectUnsanitizedDoc;
  /**
   * These are any new document(s) that have been created during the transformation process; these are not transformed, but they are marked
   * as up-to-date. Only conversion transforms generate additional documents.
   */
  additionalDocs: SavedObjectUnsanitizedDoc[];
}

type TransformFn = (doc: SavedObjectUnsanitizedDoc, options?: TransformOptions) => TransformResult;

interface TransformOptions {
  convertTypes?: boolean;
}

interface DocumentMigratorOptions {
  kibanaVersion: string;
  typeRegistry: ISavedObjectTypeRegistry;
  log: Logger;
}

interface ActiveMigrations {
  [type: string]: {
    latestVersion?: string;
    latestReferenceVersion?: string;
    transforms: Transform[];
  };
}

interface Transform {
  version: string;
  transform: (doc: SavedObjectUnsanitizedDoc) => TransformResult;
  transformType: 'migrate' | 'convert' | 'reference';
}

/**
 * Manages migration of individual documents.
 */
export interface VersionedTransformer {
  migrationVersion: SavedObjectsMigrationVersion;
  migrate: MigrateFn;
  migrateAndConvert: MigrateAndConvertFn;
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
   * @prop {Logger} log - The migration logger
   * @memberof DocumentMigrator
   */
  constructor({ typeRegistry, kibanaVersion, log }: DocumentMigratorOptions) {
    validateMigrationDefinition(typeRegistry, kibanaVersion);

    this.migrations = buildActiveMigrations(typeRegistry, log);
    this.transformDoc = buildDocumentTransform({
      kibanaVersion,
      migrations: this.migrations,
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
    return Object.entries(this.migrations).reduce((acc, [prop, { latestVersion }]) => {
      // some migration objects won't have a latestVersion (they only contain reference transforms that are applied from other types)
      if (latestVersion) {
        return { ...acc, [prop]: latestVersion };
      }
      return acc;
    }, {});
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
    // Clone the document to prevent accidental mutations on the original data
    // Ex: Importing sample data that is cached at import level, migrations would
    // execute on mutated data the second time.
    const clonedDoc = _.cloneDeep(doc);
    const { transformedDoc, additionalDocs } = this.transformDoc(clonedDoc, { convertTypes: true });
    return [transformedDoc].concat(additionalDocs);
  };
}

/**
 * Basic validation that the migration definition matches our expectations. We can't
 * rely on TypeScript here, as the caller may be JavaScript / ClojureScript / any compile-to-js
 * language. So, this is just to provide a little developer-friendly error messaging. Joi was
 * giving weird errors, so we're just doing manual validation.
 */
function validateMigrationDefinition(registry: ISavedObjectTypeRegistry, kibanaVersion: string) {
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
    if (Semver.gt(version, kibanaVersion)) {
      throw new Error(
        `Invalid migration for type ${type}. Property '${version}' cannot be greater than the current Kibana version '${kibanaVersion}'.`
      );
    }
  }

  function assertValidTransform(fn: any, version: string, type: string) {
    if (typeof fn !== 'function') {
      throw new Error(`Invalid migration ${type}.${version}: expected a function, but got ${fn}.`);
    }
  }

  function assertValidConvertToMultiNamespaceType(
    namespaceType: string,
    convertToMultiNamespaceTypeVersion: string,
    type: string
  ) {
    if (namespaceType !== 'multiple') {
      throw new Error(
        `Invalid convertToMultiNamespaceTypeVersion for type ${type}. Expected namespaceType to be 'multiple', but got '${namespaceType}'.`
      );
    } else if (!Semver.valid(convertToMultiNamespaceTypeVersion)) {
      throw new Error(
        `Invalid convertToMultiNamespaceTypeVersion for type ${type}. Expected value to be a semver, but got '${convertToMultiNamespaceTypeVersion}'.`
      );
    } else if (Semver.gt(convertToMultiNamespaceTypeVersion, kibanaVersion)) {
      throw new Error(
        `Invalid convertToMultiNamespaceTypeVersion for type ${type}. Value '${convertToMultiNamespaceTypeVersion}' cannot be greater than the current Kibana version '${kibanaVersion}'.`
      );
    } else if (Semver.patch(convertToMultiNamespaceTypeVersion)) {
      throw new Error(
        `Invalid convertToMultiNamespaceTypeVersion for type ${type}. Value '${convertToMultiNamespaceTypeVersion}' cannot be used on a patch version (must be like 'x.y.0').`
      );
    }
  }

  registry.getAllTypes().forEach((type) => {
    const { name, migrations, convertToMultiNamespaceTypeVersion, namespaceType } = type;
    if (migrations) {
      assertObject(
        type.migrations,
        `Migration for type ${name} should be an object like { '2.0.0': (doc) => doc }.`
      );
      Object.entries(migrations).forEach(([version, fn]) => {
        assertValidSemver(version, name);
        assertValidTransform(fn, version, name);
      });
    }
    if (convertToMultiNamespaceTypeVersion) {
      assertValidConvertToMultiNamespaceType(
        namespaceType,
        convertToMultiNamespaceTypeVersion,
        name
      );
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
  const referenceTransforms = getReferenceTransforms(typeRegistry);

  return typeRegistry.getAllTypes().reduce((migrations, type) => {
    const migrationTransforms = Object.entries(type.migrations ?? {}).map<Transform>(
      ([version, transform]) => ({
        version,
        transform: wrapWithTry(version, type.name, transform, log),
        transformType: 'migrate',
      })
    );
    const conversionTransforms = getConversionTransforms(type);
    const transforms = [
      ...referenceTransforms,
      ...conversionTransforms,
      ...migrationTransforms,
    ].sort(transformComparator);

    if (!transforms.length) {
      return migrations;
    }
    return {
      ...migrations,
      [type.name]: {
        latestVersion: _.last(transforms.filter((x) => x.transformType !== 'reference'))?.version,
        latestReferenceVersion: _.last(transforms.filter((x) => x.transformType === 'reference'))
          ?.version,
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
}: {
  kibanaVersion: string;
  migrations: ActiveMigrations;
}): TransformFn {
  return function transformAndValidate(
    doc: SavedObjectUnsanitizedDoc,
    options: TransformOptions = {}
  ) {
    const { convertTypes = false } = options;
    let transformedDoc: SavedObjectUnsanitizedDoc;
    let additionalDocs: SavedObjectUnsanitizedDoc[] = [];
    if (doc.migrationVersion) {
      const result = applyMigrations(doc, migrations, kibanaVersion, convertTypes);
      transformedDoc = result.transformedDoc;
      additionalDocs = additionalDocs.concat(
        result.additionalDocs.map((x) => markAsUpToDate(x, migrations, kibanaVersion))
      );
    } else {
      transformedDoc = markAsUpToDate(doc, migrations, kibanaVersion);
    }

    // In order to keep tests a bit more stable, we won't
    // tack on an empy migrationVersion to docs that have
    // no migrations defined.
    if (_.isEmpty(transformedDoc.migrationVersion)) {
      delete transformedDoc.migrationVersion;
    }

    return { transformedDoc, additionalDocs };
  };
}

function applyMigrations(
  doc: SavedObjectUnsanitizedDoc,
  migrations: ActiveMigrations,
  kibanaVersion: string,
  convertTypes: boolean
) {
  let additionalDocs: SavedObjectUnsanitizedDoc[] = [];
  while (true) {
    const prop = nextUnmigratedProp(doc, migrations);
    if (!prop) {
      // regardless of whether or not any reference transform was applied, update the referencesMigrationVersion
      // this is needed to ensure that newly created documents have an up-to-date referencesMigrationVersion field
      return {
        transformedDoc: { ...doc, referencesMigrationVersion: kibanaVersion },
        additionalDocs,
      };
    }
    const result = migrateProp(doc, prop, migrations, convertTypes);
    doc = result.transformedDoc;
    additionalDocs = additionalDocs.concat(result.additionalDocs);
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
    referencesMigrationVersion: kibanaVersion,
  };
}

/**
 * Converts a single-namespace object to a multi-namespace object. This primarily entails removing the `namespace` field and adding the
 * `namespaces` field.
 *
 * If the object does not exist in the default namespace (undefined), its ID is also regenerated, and an "originId" is added to preserve
 * legacy import/copy behavior.
 */
function convertType(doc: SavedObjectUnsanitizedDoc) {
  const { namespace, ...otherAttrs } = doc;
  const additionalDocs: SavedObjectUnsanitizedDoc[] = [];

  // If this object exists in the default namespace, return it with the appropriate `namespaces` field without changing its ID.
  if (namespace === undefined) {
    return {
      transformedDoc: { ...otherAttrs, namespaces: [DEFAULT_NAMESPACE_STRING] },
      additionalDocs,
    };
  }

  const { id: originId, type } = otherAttrs;
  // Deterministically generate a new ID for this object; the uuidv5 namespace constant (uuidv5.DNS) is arbitrary
  const id = uuidv5(`${namespace}:${type}:${originId}`, uuidv5.DNS);
  if (namespace !== undefined) {
    const legacyUrlAlias: SavedObjectUnsanitizedDoc<LegacyUrlAlias> = {
      id: `${namespace}:${type}:${originId}`,
      type: LEGACY_URL_ALIAS_TYPE,
      attributes: {
        targetNamespace: namespace,
        targetType: type,
        targetId: id,
      },
    };
    additionalDocs.push(legacyUrlAlias);
  }
  return {
    transformedDoc: { ...otherAttrs, id, originId, namespaces: [namespace] },
    additionalDocs,
  };
}

/**
 * Returns all applicable conversion transforms for a given object type.
 */
function getConversionTransforms(type: SavedObjectsType): Transform[] {
  const { convertToMultiNamespaceTypeVersion } = type;
  if (!convertToMultiNamespaceTypeVersion) {
    return [];
  }
  return [
    {
      version: convertToMultiNamespaceTypeVersion,
      transform: convertType,
      transformType: 'convert',
    },
  ];
}

/**
 * Returns all applicable reference transforms for all object types.
 */
function getReferenceTransforms(typeRegistry: ISavedObjectTypeRegistry): Transform[] {
  const transformMap = typeRegistry
    .getAllTypes()
    .filter((type) => type.convertToMultiNamespaceTypeVersion)
    .reduce((acc, { convertToMultiNamespaceTypeVersion: key, name }) => {
      const val = acc.get(key!) ?? new Set();
      return acc.set(key!, val.add(name));
    }, new Map<string, Set<string>>());

  return Array.from(transformMap, ([key, val]) => ({
    version: key,
    transform: (doc) => {
      const { namespace, references } = doc;
      if (namespace && references?.length) {
        return {
          transformedDoc: {
            ...doc,
            references: references.map(({ type, id, ...attrs }) => ({
              ...attrs,
              type,
              id: val.has(type) ? uuidv5(`${namespace}:${type}:${id}`, uuidv5.DNS) : id,
            })),
          },
          additionalDocs: [],
        };
      }
      return { transformedDoc: doc, additionalDocs: [] };
    },
    transformType: 'reference',
  }));
}

/**
 * Transforms are sorted in ascending order by version. One version may contain multiple transforms; 'reference' transforms always run
 * first, 'convert' transforms always run second, and 'migrate' transforms always run last. This is because:
 *  1. 'convert' transforms get rid of the `namespace` field, which must be present for 'reference' transforms to function correctly.
 *  2. 'migrate' transforms are defined by the consumer, and may change the object type or migrationVersion which resets the migration loop
 *     and could cause any remaining transforms for this version to be skipped.
 */
function transformComparator(a: Transform, b: Transform) {
  const semver = Semver.compare(a.version, b.version);
  if (semver !== 0) {
    return semver;
  } else if (a.transformType !== b.transformType) {
    if (a.transformType === 'migrate') {
      return 1;
    } else if (b.transformType === 'migrate') {
      return -1;
    } else if (a.transformType === 'convert') {
      return 1;
    } else if (b.transformType === 'convert') {
      return -1;
    }
  }
  return 0;
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

      return { transformedDoc: result, additionalDocs: [] };
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

function getHasPendingReferenceTransform(
  doc: SavedObjectUnsanitizedDoc,
  migrations: ActiveMigrations,
  prop: string
) {
  if (!migrations[prop]) {
    return false;
  }

  const { latestReferenceVersion } = migrations[prop];
  const { referencesMigrationVersion } = doc;
  return (
    latestReferenceVersion &&
    (!referencesMigrationVersion || Semver.gt(latestReferenceVersion, referencesMigrationVersion))
  );
}

/**
 * Finds the first unmigrated property in the specified document.
 */
function nextUnmigratedProp(doc: SavedObjectUnsanitizedDoc, migrations: ActiveMigrations) {
  return props(doc).find((p) => {
    const latestVersion = propVersion(migrations, p);
    const docVersion = propVersion(doc, p);
    const hasPendingReferenceTransform = getHasPendingReferenceTransform(doc, migrations, p);

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

    return (latestVersion && latestVersion !== docVersion) || hasPendingReferenceTransform;
  });
}

/**
 * Applies any relevent migrations to the document for the specified property.
 */
function migrateProp(
  doc: SavedObjectUnsanitizedDoc,
  prop: string,
  migrations: ActiveMigrations,
  convertTypes: boolean
): TransformResult {
  const originalType = doc.type;
  let migrationVersion = _.clone(doc.migrationVersion) || {};
  let additionalDocs: SavedObjectUnsanitizedDoc[] = [];

  for (const { version, transform, transformType } of applicableTransforms(migrations, doc, prop)) {
    const currentVersion = propVersion(doc, prop);
    if (currentVersion && Semver.gt(currentVersion, version)) {
      // the previous transform function increased the object's migrationVersion; break out of the loop
      break;
    }

    if (transformType === 'migrate' || convertTypes) {
      // migrate transforms are always applied, but conversion transforms and reference transforms are only applied when Kibana is upgraded
      const result = transform(doc);
      doc = result.transformedDoc;
      additionalDocs = additionalDocs.concat(result.additionalDocs);
    }
    if (transformType === 'reference') {
      // regardless of whether or not the reference transform was applied, increment the version
      doc.referencesMigrationVersion = version;
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
  const minReferenceVersion = doc.referencesMigrationVersion || '0.0.0';
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
