/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType, ModelVersionIdentifier } from '@kbn/core-saved-objects-server';
import type { MigrationInfoRecord, ModelVersionSummary } from '../../types';
import { getVersions } from '../../migrations';

export function getFirstModelVersion(info: MigrationInfoRecord): ModelVersionSummary {
  const firstVersion = getVersions(info)
    .filter((version) => version !== '0.0.0')
    .pop()!;
  return info.modelVersions.find(({ version }) => `10.${version}.0` === firstVersion)!;
}

export function getLatestModelVersion(info: MigrationInfoRecord): ModelVersionSummary {
  const latestVersion = getVersions(info).shift()!;
  return info.modelVersions.find(({ version }) => `10.${version}.0` === latestVersion)!;
}

export function validateInitialModelVersion(name: string, mv: ModelVersionSummary): void {
  if (mv.changeTypes.length) {
    throw new Error(
      `❌ The new model version '${mv.version}' for SO type '${name}' is defining mappings' changes. For backwards-compatibility reasons, the initial model version can only include schema definitions.`
    );
  }
}

export function validateModelVersionNumbers(name: string, mvs: ModelVersionSummary[]) {
  mvs
    .map<number>(({ version }) => {
      const parsed = parseInt(version, 10);
      if (isNaN(parsed)) {
        throw new Error(
          `❌ Invalid model version '${version}' for SO type '${name}'. Model versions must be consecutive integer numbers starting at 1.`
        );
      }
      return parsed;
    })
    .sort((a, b) => a - b)
    .forEach((versionNumber, index, list) => {
      if (versionNumber !== index + 1) {
        throw new Error(
          `❌ The '${name}' SO type is missing model version '${
            index + 1
          }'. Model versions defined: ${list}`
        );
      }
    });
}

export function validateNewModelVersionSchemas(name: string, mv: ModelVersionSummary) {
  if (!mv.schemas) {
    throw new Error(
      `❌ The new model version '${mv.version}' for SO type '${name}' is missing the 'schemas' definition.`
    );
  }
  if (mv.schemas.forwardCompatibility === false) {
    throw new Error(
      `❌ The new model version '${mv.version}' for SO type '${name}' is missing the 'forwardCompatibility' schema definition.`
    );
  }
  if (mv.schemas.create === false) {
    throw new Error(
      `❌ The new model version '${mv.version}' for SO type '${name}' is missing the 'create' schema definition.`
    );
  }
}

/**
 * Extracts field paths from flattened ES mapping keys (e.g. properties.foo.type, properties.bar.properties.baz.type).
 * Returns paths in ES format (e.g. "bar.properties.baz" for nested).
 */
export function getMappingFieldPaths(mappings: Record<string, unknown>): string[] {
  return [
    ...new Set(
      Object.keys(mappings)
        .filter((key) => key.startsWith('properties.'))
        .map((key) => {
          const withoutPrefix = key.slice('properties.'.length);
          const lastDotIndex = withoutPrefix.lastIndexOf('.');
          return lastDotIndex > 0 ? withoutPrefix.slice(0, lastDotIndex) : null;
        })
        .filter((path): path is string => path !== null)
    ),
  ].sort();
}

/**
 * Normalizes ES mapping path (e.g. "schedule.properties.interval") to schema path format (e.g. "schedule.interval")
 * for comparison with getSchemaStructure() output.
 */
export function toSchemaPathFormat(mappingPath: string): string {
  return mappingPath.replace(/\.properties\./g, '.');
}

export function validateAllMappingsInModelVersion(
  name: string,
  to: MigrationInfoRecord,
  registeredType: SavedObjectsType
): void {
  if (!to.modelVersions?.length) {
    return;
  }

  const modelVersionMap =
    typeof registeredType.modelVersions === 'function'
      ? registeredType.modelVersions()
      : registeredType.modelVersions ?? {};

  const latestVersionKey = Object.keys(modelVersionMap)
    .map(Number)
    .sort((a, b) => a - b)
    .pop();

  if (!latestVersionKey) {
    return;
  }

  const latestModelVersion = modelVersionMap[String(latestVersionKey) as ModelVersionIdentifier];
  const createSchema = latestModelVersion?.schemas?.create;
  if (!createSchema) {
    return;
  }

  const mappingFieldPaths = getMappingFieldPaths(to.mappings);
  const schemaFields = (
    createSchema.getSchemaStructure() as Array<{ path: string[]; type: string }>
  ).map(({ path }) => path.join('.'));

  // Normalize mapping paths (ES format: "parent.properties.child") to schema format ("parent.child")
  const normalizedMappingPaths = mappingFieldPaths.map((p) => toSchemaPathFormat(p));
  const undeclaredFields = normalizedMappingPaths.filter((field) => !schemaFields.includes(field));

  if (undeclaredFields.length > 0) {
    throw new Error(
      `❌ The SO type '${name}' has mapping fields not present in the latest model version schema: ${undeclaredFields.join(
        ', '
      )}. ` + `All mapping fields must be declared in the latest model version's 'create' schema.`
    );
  }
}

export function validateNoIndexOrEnabledFalse(
  name: string,
  to: MigrationInfoRecord,
  modelVersionsToCheck: ModelVersionSummary[]
): void {
  const fieldsWithIndexFalse: string[] = [];
  const fieldsWithEnabledFalse: string[] = [];

  modelVersionsToCheck.forEach((modelVersion) => {
    modelVersion.newMappings.forEach((mapping) => {
      const lastDot = mapping.lastIndexOf('.');
      const fieldPath = lastDot > 0 ? mapping.slice(0, lastDot) : mapping;

      if (to.mappings[`properties.${fieldPath}.index`] === false) {
        fieldsWithIndexFalse.push(fieldPath);
      }
      if (to.mappings[`properties.${fieldPath}.enabled`] === false) {
        fieldsWithEnabledFalse.push(fieldPath);
      }
    });
  });

  if (fieldsWithIndexFalse.length > 0) {
    throw new Error(
      `❌ The SO type '${name}' has new mapping fields with 'index: false': ${fieldsWithIndexFalse.join(
        ', '
      )}. ` +
        `This option cannot be updated without reindexing. Use 'dynamic: false' instead or omit the mapping.`
    );
  }

  if (fieldsWithEnabledFalse.length > 0) {
    throw new Error(
      `❌ The SO type '${name}' has new mapping fields with 'enabled: false': ${fieldsWithEnabledFalse.join(
        ', '
      )}. ` +
        `This option cannot be updated without reindexing. Use 'dynamic: false' instead or omit the mapping.`
    );
  }
}

export function validateNameTitleFieldTypes(name: string, to: MigrationInfoRecord): void {
  const invalidFields: string[] = [];

  if ('properties.name.type' in to.mappings && to.mappings['properties.name.type'] !== 'text') {
    invalidFields.push(`name (type: ${to.mappings['properties.name.type']}, expected: text)`);
  }

  if ('properties.title.type' in to.mappings && to.mappings['properties.title.type'] !== 'text') {
    invalidFields.push(`title (type: ${to.mappings['properties.title.type']}, expected: text)`);
  }

  if (invalidFields.length > 0) {
    throw new Error(
      `❌ The SO type '${name}' has 'name' or 'title' fields with incorrect types: ${invalidFields.join(
        ', '
      )}. ` + `These fields must be of type 'text' for Search API compatibility.`
    );
  }
}
