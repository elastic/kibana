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
import { assertValidModelVersion } from '@kbn/core-saved-objects-base-server-internal';

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
        `Type ${type.name}: invalid version specified for switchToModelVersionAt: ${type.switchToModelVersionAt}`
      );
    }
    if (switchToModelVersionAt.patch !== 0) {
      throw new Error(`Type ${type.name}: can't use a patch version for switchToModelVersionAt`);
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

    Object.entries(migrationMap).forEach(([version, migration]) => {
      assertValidSemver(kibanaVersion, version, type.name);
      assertValidTransform(migration, version, type.name);
      if (type.switchToModelVersionAt && Semver.gte(version, type.switchToModelVersionAt)) {
        throw new Error(
          `Migration for type ${type.name} for version ${version} registered after switchToModelVersionAt (${type.switchToModelVersionAt})`
        );
      }
    });
  }

  if (type.modelVersions) {
    const modelVersionMap =
      typeof type.modelVersions === 'function' ? type.modelVersions() : type.modelVersions ?? {};

    if (Object.keys(modelVersionMap).length > 0 && !type.switchToModelVersionAt) {
      throw new Error(
        `Type ${type.name}: Uusing modelVersions requires to specify switchToModelVersionAt`
      );
    }

    Object.entries(modelVersionMap).forEach(([version, definition]) => {
      assertValidModelVersion(version);
    });

    const { min: minVersion, max: maxVersion } = Object.keys(modelVersionMap).reduce(
      (minMax, rawVersion) => {
        const version = Number.parseInt(rawVersion, 10);
        minMax.min = Math.min(minMax.min, version);
        minMax.max = Math.max(minMax.max, version);
        return minMax;
      },
      { min: Infinity, max: -Infinity }
    );

    if (minVersion > 1) {
      throw new Error(`Type ${type.name}: model versioning must start with version 1`);
    }
    const missingVersions = getMissingVersions(
      minVersion,
      maxVersion,
      Object.keys(modelVersionMap).map((v) => Number.parseInt(v, 10))
    );
    if (missingVersions.length) {
      throw new Error(
        `Type ${
          type.name
        }: gaps between model versions aren't allowed (missing versions: ${missingVersions.join(
          ','
        )})`
      );
    }
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

const assertValidTransform = (migration: any, version: string, type: string) => {
  if (
    !(typeof migration === 'object' && typeof migration.transform === 'function') &&
    typeof migration !== 'function'
  ) {
    throw new Error(
      `Invalid migration ${type}.${version}: expected a function or an object, but got ${migration}.`
    );
  }
};

const getMissingVersions = (from: number, to: number, versions: number[]): number[] => {
  const versionSet = new Set(versions);
  const missing: number[] = [];
  for (let i = from; i <= to; i++) {
    if (!versionSet.has(i)) {
      missing.push(i);
    }
  }
  return missing;
};
