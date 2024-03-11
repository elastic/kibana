/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Semver from 'semver';
import { getFlattenedObject } from '@kbn/std';
import type { SavedObjectsNamespaceType } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectsType,
  SavedObjectsTypeMappingDefinition,
  SavedObjectsModelVersionMap,
} from '@kbn/core-saved-objects-server';
import { assertValidModelVersion } from '@kbn/core-saved-objects-base-server-internal';
import {
  SavedObjectsModelChange,
  SavedObjectsModelMappingsAdditionChange,
} from '@kbn/core-saved-objects-server';

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

  if (type.schemas) {
    const schemaMap = typeof type.schemas === 'object' ? type.schemas : {};
    assertObject(
      schemaMap,
      `Schemas map for type ${type.name} should be an object like { '2.0.0': {schema} }.`
    );

    Object.entries(schemaMap).forEach(([version, schema]) => {
      assertValidSemver(kibanaVersion, version, type.name);
      if (type.switchToModelVersionAt && Semver.gte(version, type.switchToModelVersionAt)) {
        throw new Error(
          `Schema for type ${type.name} for version ${version} registered after switchToModelVersionAt (${type.switchToModelVersionAt})`
        );
      }
    });
  }

  if (type.modelVersions) {
    const modelVersionMap =
      typeof type.modelVersions === 'function' ? type.modelVersions() : type.modelVersions ?? {};

    if (Object.keys(modelVersionMap).length > 0) {
      if (!type.switchToModelVersionAt) {
        throw new Error(
          `Type ${type.name}: Using modelVersions requires to specify switchToModelVersionAt`
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

      validateAddedMappings(type.name, type.mappings, modelVersionMap);

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

function isMappingAddition(
  change: SavedObjectsModelChange
): change is SavedObjectsModelMappingsAdditionChange {
  return change.type === 'mappings_addition';
}

const validateAddedMappings = (
  typeName: string,
  mappings: SavedObjectsTypeMappingDefinition,
  modelVersions: SavedObjectsModelVersionMap
) => {
  const flattenedMappings = new Map(Object.entries(getFlattenedObject(mappings.properties)));

  const mappingAdditionChanges = Object.values(modelVersions)
    .flatMap((version) => version.changes)
    .filter<SavedObjectsModelMappingsAdditionChange>(isMappingAddition);
  const addedMappings = mappingAdditionChanges.reduce((map, change) => {
    const flattened = getFlattenedObject(change.addedMappings);
    Object.keys(flattened).forEach((key) => {
      map.set(key, flattened[key]);
    });
    return map;
  }, new Map<string, unknown>());

  const missingMappings: string[] = [];
  const mappingsWithDifferentValues: string[] = [];

  for (const [key, value] of addedMappings.entries()) {
    if (!flattenedMappings.has(key)) {
      missingMappings.push(key);
    } else {
      const valueInMappings = flattenedMappings.get(key);
      if (valueInMappings !== value) {
        mappingsWithDifferentValues.push(key);
      }
    }
  }

  if (missingMappings.length) {
    throw new Error(
      `Type ${typeName}: mappings added on model versions not present on the global mappings definition: ${missingMappings.join(
        ','
      )}`
    );
  }
  if (mappingsWithDifferentValues.length) {
    throw new Error(
      `Type ${typeName}: mappings added on model versions differs from the global mappings definition: ${mappingsWithDifferentValues.join(
        ','
      )}`
    );
  }
};

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
