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
import uuidv5 from 'uuid/v5';
import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';
import Semver from 'semver';
import { Logger } from '../../../logging';
import { SavedObjectUnsanitizedDoc } from '../../serialization';
import {
  SavedObjectsMigrationVersion,
  SavedObjectsNamespaceType,
  SavedObjectsType,
} from '../../types';
import { MigrationLogger } from './migration_logger';
import { TransformSavedObjectDocumentError } from '.';
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectMigrationFn, SavedObjectMigrationMap } from '../types';
import { DEFAULT_NAMESPACE_STRING, SavedObjectsUtils } from '../../service/lib/utils';
import { LegacyUrlAlias, LEGACY_URL_ALIAS_TYPE } from '../../object_types';

const DEFAULT_MINIMUM_CONVERT_VERSION = '8.0.0';

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
  minimumConvertVersion?: string;
  log: Logger;
}

interface ActiveMigrations {
  [type: string]: {
    /** Derived from `migrate` transforms and `convert` transforms */
    latestMigrationVersion?: string;
    /** Derived from `reference` transforms */
    latestCoreMigrationVersion?: string;
    transforms: Transform[];
  };
}

interface Transform {
  version: string;
  transform: (doc: SavedObjectUnsanitizedDoc) => TransformResult;
  /**
   * There are two "migrationVersion" transform types:
   *   * `migrate` - These transforms are defined and added by consumers using the type registry; each is applied to a single object type
   *     based on an object's `migrationVersion[type]` field. These are applied during index migrations and document migrations.
   *   * `convert` - These transforms are defined by core and added by consumers using the type registry; each is applied to a single object
   *     type based on an object's `migrationVersion[type]` field. These are applied during index migrations, NOT document migrations.
   *
   * There is one "coreMigrationVersion" transform type:
   *   * `reference` - These transforms are defined by core and added by consumers using the type registry; they are applied to all object
   *     types based on their `coreMigrationVersion` field. These are applied during index migrations, NOT document migrations.
   *
   * If any additional transform types are added, the functions below should be updated to account for them.
   */
  transformType: 'migrate' | 'convert' | 'reference';
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
  private documentMigratorOptions: Omit<DocumentMigratorOptions, 'minimumConvertVersion'>;
  private migrations?: ActiveMigrations;
  private transformDoc?: ApplyTransformsFn;

  /**
   * Creates an instance of DocumentMigrator.
   *
   * @param {DocumentMigratorOptions} opts
   * @prop {string} kibanaVersion - The current version of Kibana
   * @prop {SavedObjectTypeRegistry} typeRegistry - The type registry to get type migrations from
   * @prop {string} minimumConvertVersion - The minimum version of Kibana in which documents can be converted to multi-namespace types
   * @prop {Logger} log - The migration logger
   * @memberof DocumentMigrator
   */
  constructor({
    typeRegistry,
    kibanaVersion,
    minimumConvertVersion = DEFAULT_MINIMUM_CONVERT_VERSION,
    log,
  }: DocumentMigratorOptions) {
    validateMigrationDefinition(typeRegistry, kibanaVersion, minimumConvertVersion);

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

function validateMigrationsMapObject(
  name: string,
  kibanaVersion: string,
  migrationsMap?: SavedObjectMigrationMap
) {
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

  if (migrationsMap) {
    assertObject(
      migrationsMap,
      `Migrations map for type ${name} should be an object like { '2.0.0': (doc) => doc }.`
    );

    Object.entries(migrationsMap).forEach(([version, fn]) => {
      assertValidSemver(version, name);
      assertValidTransform(fn, version, name);
    });
  }
}

/**
 * Basic validation that the migration definition matches our expectations. We can't
 * rely on TypeScript here, as the caller may be JavaScript / ClojureScript / any compile-to-js
 * language. So, this is just to provide a little developer-friendly error messaging. Joi was
 * giving weird errors, so we're just doing manual validation.
 */
function validateMigrationDefinition(
  registry: ISavedObjectTypeRegistry,
  kibanaVersion: string,
  minimumConvertVersion: string
) {
  function assertObjectOrFunction(entity: any, prefix: string) {
    if (!entity || (typeof entity !== 'function' && typeof entity !== 'object')) {
      throw new Error(`${prefix} Got! ${typeof entity}, ${JSON.stringify(entity)}.`);
    }
  }

  function assertValidConvertToMultiNamespaceType(
    namespaceType: SavedObjectsNamespaceType,
    convertToMultiNamespaceTypeVersion: string,
    type: string
  ) {
    if (namespaceType !== 'multiple' && namespaceType !== 'multiple-isolated') {
      throw new Error(
        `Invalid convertToMultiNamespaceTypeVersion for type ${type}. Expected namespaceType to be 'multiple' or 'multiple-isolated', but got '${namespaceType}'.`
      );
    } else if (!Semver.valid(convertToMultiNamespaceTypeVersion)) {
      throw new Error(
        `Invalid convertToMultiNamespaceTypeVersion for type ${type}. Expected value to be a semver, but got '${convertToMultiNamespaceTypeVersion}'.`
      );
    } else if (Semver.lt(convertToMultiNamespaceTypeVersion, minimumConvertVersion)) {
      throw new Error(
        `Invalid convertToMultiNamespaceTypeVersion for type ${type}. Value '${convertToMultiNamespaceTypeVersion}' cannot be less than '${minimumConvertVersion}'.`
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
      assertObjectOrFunction(
        type.migrations,
        `Migration for type ${name} should be an object or a function returning an object like { '2.0.0': (doc) => doc }.`
      );
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
 * To:   { type: { latestMigrationVersion?: string; latestCoreMigrationVersion?: string; transforms: [{ version: string, transform: fn }] } }
 */
function buildActiveMigrations(
  typeRegistry: ISavedObjectTypeRegistry,
  kibanaVersion: string,
  log: Logger
): ActiveMigrations {
  const referenceTransforms = getReferenceTransforms(typeRegistry);

  return typeRegistry.getAllTypes().reduce((migrations, type) => {
    const migrationsMap =
      typeof type.migrations === 'function' ? type.migrations() : type.migrations;
    validateMigrationsMapObject(type.name, kibanaVersion, migrationsMap);

    const migrationTransforms = Object.entries(migrationsMap ?? {}).map<Transform>(
      ([version, transform]) => ({
        version,
        transform: wrapWithTry(version, type, transform, log),
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

    const migrationVersionTransforms: Transform[] = [];
    const coreMigrationVersionTransforms: Transform[] = [];
    transforms.forEach((x) => {
      if (x.transformType === 'migrate' || x.transformType === 'convert') {
        migrationVersionTransforms.push(x);
      } else {
        coreMigrationVersionTransforms.push(x);
      }
    });

    return {
      ...migrations,
      [type.name]: {
        latestMigrationVersion: _.last(migrationVersionTransforms)?.version,
        latestCoreMigrationVersion: _.last(coreMigrationVersionTransforms)?.version,
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
 * Converts a single-namespace object to a multi-namespace object. This primarily entails removing the `namespace` field and adding the
 * `namespaces` field.
 *
 * If the object does not exist in the default namespace (undefined), its ID is also regenerated, and an "originId" is added to preserve
 * legacy import/copy behavior.
 */
function convertNamespaceType(doc: SavedObjectUnsanitizedDoc) {
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
  const id = SavedObjectsUtils.getConvertedObjectId(namespace, type, originId!);
  const legacyUrlAlias: SavedObjectUnsanitizedDoc<LegacyUrlAlias> = {
    id: `${namespace}:${type}:${originId}`,
    type: LEGACY_URL_ALIAS_TYPE,
    attributes: {
      // NOTE TO MAINTAINERS: If a saved object migration is added in `src/core/server/saved_objects/object_types/registration.ts`, these
      // values must be updated accordingly. That's because a user can upgrade Kibana from 7.17 to 8.x, and any defined migrations will not
      // be applied to aliases that are created during the conversion process.
      sourceId: originId,
      targetNamespace: namespace,
      targetType: type,
      targetId: id,
      purpose: 'savedObjectConversion',
    },
  };
  additionalDocs.push(legacyUrlAlias);
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
      transform: convertNamespaceType,
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
    .reduce((acc, { convertToMultiNamespaceTypeVersion: version, name }) => {
      const types = acc.get(version!) ?? new Set();
      return acc.set(version!, types.add(name));
    }, new Map<string, Set<string>>());

  return Array.from(transformMap, ([version, types]) => ({
    version,
    transform: (doc) => {
      const { namespace, references } = doc;
      if (namespace && references?.length) {
        return {
          transformedDoc: {
            ...doc,
            references: references.map(({ type, id, ...attrs }) => ({
              ...attrs,
              type,
              id: types.has(type)
                ? SavedObjectsUtils.getConvertedObjectId(namespace, type, id)
                : id,
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
  type: SavedObjectsType,
  migrationFn: SavedObjectMigrationFn,
  log: Logger
) {
  const context = Object.freeze({
    log: new MigrationLogger(log),
    migrationVersion: version,
    convertToMultiNamespaceTypeVersion: type.convertToMultiNamespaceTypeVersion,
    isSingleNamespaceType: type.namespaceType === 'single',
  });

  return function tryTransformDoc(doc: SavedObjectUnsanitizedDoc) {
    try {
      const result = migrationFn(doc, context);

      // A basic sanity check to help migration authors detect basic errors
      // (e.g. forgetting to return the transformed doc)
      if (!result || !result.type) {
        throw new Error(`Invalid saved object returned from migration ${type.name}:${version}.`);
      }

      return { transformedDoc: result, additionalDocs: [] };
    } catch (error) {
      log.error(error);
      throw new TransformSavedObjectDocumentError(error, version);
    }
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

/**
 * Deterministically regenerates a saved object's ID based upon it's current namespace, type, and ID. This ensures that we can regenerate
 * any existing object IDs without worrying about collisions if two objects that exist in different namespaces share an ID. It also ensures
 * that we can later regenerate any inbound object references to match.
 *
 * @note This is only intended to be used when single-namespace object types are converted into multi-namespace object types.
 * @internal
 */
export function deterministicallyRegenerateObjectId(namespace: string, type: string, id: string) {
  return uuidv5(`${namespace}:${type}:${id}`, uuidv5.DNS); // the uuidv5 namespace constant (uuidv5.DNS) is arbitrary
}
