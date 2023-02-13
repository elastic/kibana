/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Semver from 'semver';
import type { SavedObjectsNamespaceType } from '@kbn/core-saved-objects-common';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

/**
 * Validates the consistency of the given type for use with the document migrator.
 */
export function validateTypeMigrations({
  type,
  kibanaVersion,
  convertVersion,
}: {
  type: SavedObjectsType;
  kibanaVersion: string;
  convertVersion?: string;
}) {
  if (type.switchToModelVersionAt) {
    const switchToModelVersionAt = Semver.parse(type.switchToModelVersionAt);
    if (!switchToModelVersionAt) {
      throw new Error(
        `Invalid version specified for switchToModelVersionAt: ${type.switchToModelVersionAt}`
      );
    }
    if (switchToModelVersionAt.patch !== 0) {
      throw new Error(`Can't use a patch version for switchToModelVersionAt`);
    }
  }

  if (type.migrations) {
    assertObjectOrFunction(
      type.migrations,
      `Migration for type ${type.name} should be an object or a function returning an object like { '2.0.0': (doc) => doc }.`
    );

    const migrationMap =
      typeof type.migrations === 'function' ? type.migrations() : type.migrations ?? {};

    assertObject(
      migrationMap,
      `Migrations map for type ${type.name} should be an object like { '2.0.0': (doc) => doc }.`
    );

    Object.entries(migrationMap).forEach(([version, fn]) => {
      assertValidSemver(kibanaVersion, version, type.name);
      assertValidTransform(fn, version, type.name);
      if (type.switchToModelVersionAt && Semver.gte(version, type.switchToModelVersionAt)) {
        throw new Error(
          `Migration for type ${type.name} for version ${version} registered after switchToModelVersionAt (${type.switchToModelVersionAt})`
        );
      }
    });
  }

  if (type.convertToMultiNamespaceTypeVersion) {
    assertValidConvertToMultiNamespaceType(
      kibanaVersion,
      convertVersion,
      type.namespaceType,
      type.convertToMultiNamespaceTypeVersion,
      type.name
    );
  }
}

const assertObjectOrFunction = (entity: any, prefix: string) => {
  if (!entity || (typeof entity !== 'function' && typeof entity !== 'object')) {
    throw new Error(`${prefix} Got! ${typeof entity}, ${JSON.stringify(entity)}.`);
  }
};

const assertObject = (obj: any, prefix: string) => {
  if (!obj || typeof obj !== 'object') {
    throw new Error(`${prefix} Got ${obj}.`);
  }
};

const assertValidSemver = (kibanaVersion: string, version: string, type: string) => {
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
};

const assertValidConvertToMultiNamespaceType = (
  kibanaVersion: string,
  convertVersion: string | undefined,
  namespaceType: SavedObjectsNamespaceType,
  convertToMultiNamespaceTypeVersion: string,
  type: string
) => {
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
};

const assertValidTransform = (fn: any, version: string, type: string) => {
  if (typeof fn !== 'function') {
    throw new Error(`Invalid migration ${type}.${version}: expected a function, but got ${fn}.`);
  }
};
