/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compare as semverCompare } from 'semver';
import { getFlattenedObject } from '@kbn/std';
import type { SavedObjectsNamespaceType } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectsFullModelVersion,
  SavedObjectsFullModelVersionSchemaDefinitions,
  SavedObjectsModelVersion,
  SavedObjectsModelVersionSchemaDefinitions,
  SavedObjectsType,
} from '@kbn/core-saved-objects-server';
import { aggregateMappingAdditions } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectsModelChange } from '@kbn/core-saved-objects-server';
import { createHash } from 'crypto';
import { type Type, isConfigSchema } from '@kbn/config-schema';

export interface SavedObjectTypeMigrationInfo {
  name: string;
  namespaceType: SavedObjectsNamespaceType;
  convertToAliasScript?: string;
  convertToMultiNamespaceTypeVersion?: string;
  migrationVersions: string[];
  schemaVersions: string[];
  mappings: Record<string, unknown>;
  hasExcludeOnUpgrade: boolean;
  modelVersions: ModelVersionSummary[];
  switchToModelVersionAt?: string;
}

export interface ModelVersionSummary {
  version: string;
  modelVersionHash: string;
  changeTypes: string[];
  hasTransformation: boolean;
  newMappings: string[];
  schemas: {
    create: false | string;
    forwardCompatibility: false | string;
  };
}

/**
 * Extract all migration-relevant informations bound to given type in a serializable format.
 *
 * @param soType
 */
export const extractMigrationInfo = (soType: SavedObjectsType): SavedObjectTypeMigrationInfo => {
  const migrationMap =
    typeof soType.migrations === 'function' ? soType.migrations() : soType.migrations;
  const migrationVersions = Object.keys(migrationMap ?? {});
  migrationVersions.sort(semverCompare);

  const schemaMap = typeof soType.schemas === 'function' ? soType.schemas() : soType.schemas;
  const schemaVersions = Object.keys(schemaMap ?? {});
  schemaVersions.sort(semverCompare);

  const modelVersionMap =
    typeof soType.modelVersions === 'function'
      ? soType.modelVersions()
      : soType.modelVersions ?? {};

  const getModelVersionHash = (
    modelVersion: SavedObjectsModelVersion | SavedObjectsFullModelVersion
  ) => {
    const hash = createHash('sha256');
    const modelVersionData = JSON.stringify(normalizeForHash(modelVersion));
    return `${hash.update(modelVersionData).digest('hex')}`;
  };

  const modelVersions: ModelVersionSummary[] = Object.entries(modelVersionMap).map(
    ([version, modelVersion]) => {
      const { changes, schemas } = modelVersion ?? { changes: [] };
      return {
        version,
        modelVersionHash: getModelVersionHash(modelVersion),
        changeTypes: [...new Set(changes.map((change) => change.type))].sort(),
        hasTransformation: hasTransformation(changes),
        newMappings: Object.keys(getFlattenedObject(aggregateMappingAdditions(changes))),
        schemas: { ...getSchemaPropertiesHashes(schemas) },
      };
    }
  );
  return {
    name: soType.name,
    namespaceType: soType.namespaceType,
    convertToAliasScript: soType.convertToAliasScript,
    convertToMultiNamespaceTypeVersion: soType.convertToMultiNamespaceTypeVersion,
    migrationVersions,
    schemaVersions,
    mappings: getFlattenedObject(soType.mappings ?? {}),
    hasExcludeOnUpgrade: !!soType.excludeOnUpgrade,
    modelVersions,
  };
};

const changesWithTransform = ['data_backfill', 'data_removal', 'unsafe_transform'];
const hasTransformation = (changes: SavedObjectsModelChange[]): boolean => {
  return changes.some((change) => changesWithTransform.includes(change.type));
};

const getSchemaPropertiesHashes = (
  schemas?:
    | SavedObjectsModelVersionSchemaDefinitions
    | SavedObjectsFullModelVersionSchemaDefinitions
) => {
  if (!schemas) {
    return {
      forwardCompatibility: false as const,
      create: false as const,
    };
  }
  const { forwardCompatibility, create } = schemas;
  return {
    forwardCompatibility: forwardCompatibility ? getHash(forwardCompatibility) : (false as const),
    create: create ? getHash(create) : (false as const),
  };
};

const getHash = (schemaProp: unknown) => {
  const hash = createHash('sha256');
  if (typeof schemaProp === 'function') {
    return hash.update(schemaProp.toString()).digest('hex');
  } else if (isConfigSchema(schemaProp)) {
    return hash.update(JSON.stringify(serializeConfigSchema(schemaProp))).digest('hex');
  } else if (typeof schemaProp === 'object' && schemaProp !== null) {
    return hash.update(JSON.stringify(schemaProp)).digest('hex');
  }
  return false;
};

/**
 * Recursively walks a value and replaces any `@kbn/config-schema` `Type` instances
 * with a Joi-version-stable representation derived from `schema.describe()`.
 * Non-schema functions are left as-is and will be dropped by `JSON.stringify`.
 */
export const normalizeForHash = (value: unknown): unknown => {
  if (isConfigSchema(value)) return serializeConfigSchema(value);
  if (Array.isArray(value)) return value.map(normalizeForHash);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeForHash(v)]));
  return value;
};

/**
 * Converts a `@kbn/config-schema` `Type` instance to a Joi-version-stable,
 * JSON-serializable representation by using Joi's public `describe()` API and
 * replacing any remaining function values with their source text.
 */
const serializeConfigSchema = (configSchema: Type<unknown>): unknown =>
  replaceFunctionsWithSource(configSchema.getSchema().describe());

/**
 * Recursively walks a value (typically from `schema.describe()`) and replaces
 * any function values with `{ __fn: fn.toString() }` so they are not silently
 * dropped by `JSON.stringify`. This captures custom-validator presence
 * (added/removed rules change the hash) while remaining Joi-version-stable.
 */
const replaceFunctionsWithSource = (value: unknown): unknown => {
  if (typeof value === 'function') return { __fn: value.toString() };
  if (Array.isArray(value)) return value.map(replaceFunctionsWithSource);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, replaceFunctionsWithSource(v)])
    );
  return value;
};
