/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Semver from 'semver';
import type { SavedObjectsNamespaceType } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectMigrationMap,
  ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';

/**
 * Basic validation that the migration definition matches our expectations. We can't
 * rely on TypeScript here, as the caller may be JavaScript / ClojureScript / any compile-to-js
 * language. So, this is just to provide a little developer-friendly error messaging. Joi was
 * giving weird errors, so we're just doing manual validation.
 */
export function validateMigrationDefinition(
  registry: ISavedObjectTypeRegistry,
  kibanaVersion: string,
  convertVersion?: string
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
    } else if (convertVersion && Semver.neq(convertToMultiNamespaceTypeVersion, convertVersion)) {
      throw new Error(
        `Invalid convertToMultiNamespaceTypeVersion for type ${type}. Value '${convertToMultiNamespaceTypeVersion}' cannot be any other than '${convertVersion}'.`
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
      // CHECKPOINT 1
      assertValidConvertToMultiNamespaceType(
        namespaceType,
        convertToMultiNamespaceTypeVersion,
        name
      );
    }
  });
}

export function validateMigrationsMapObject(
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
