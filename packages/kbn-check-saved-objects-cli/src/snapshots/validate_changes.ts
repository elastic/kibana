/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import equal from 'fast-deep-equal';
import { cloneDeep, difference } from 'lodash';
import type { SavedObjectsType, ModelVersionIdentifier } from '@kbn/core-saved-objects-server';
import type { MigrationInfoRecord, ModelVersionSummary } from '../types';

interface ValidateChangesExistingTypeParams {
  from: MigrationInfoRecord;
  to: MigrationInfoRecord;
}

export function validateChangesExistingType({ from, to }: ValidateChangesExistingTypeParams): void {
  const name = to.name;

  // check that no migrations have been removed
  if (
    (from.migrationVersions && !to.migrationVersions) ||
    !equal(to.migrationVersions, from.migrationVersions)
  ) {
    throw new Error(
      `❌ Modifications have been detected in the '${name}.migrations'. This property is deprected and no modifications are allowed.`
    );
  }

  // check that no model versions have been removed
  if (
    (from.modelVersions && !to.modelVersions) ||
    to.modelVersions.length < from.modelVersions.length
  ) {
    throw new Error(`❌ Some model versions have been deleted for SO type '${name}'.`);
  }

  // check that current changes don't define more than 1 new modelVersion
  if (to.modelVersions.length - from.modelVersions.length > 1) {
    throw new Error(`❌ The SO type '${name}' is defining two (or more) new model versions.`);
  }

  // check that existing model versions have not been mutated
  const mutatedModelVersions = getMutatedModelVersions(from, to);
  if (mutatedModelVersions.length > 0) {
    throw new Error(
      `❌ Some modelVersions have been updated for SO type '${name}' after they were defined: ${mutatedModelVersions}.`
    );
  }

  // check that the last modelVersion has schemas and that schemas have both create and forwardCompatibility defined
  if (to.modelVersions.length > from.modelVersions.length) {
    validateLastModelVersion(name, to.modelVersions);
  }

  // check that defined modelVersions are consecutive integer numbers, starting at 1
  validateModelVersionNumbers(name, to.modelVersions);

  // ensure that updates in mappings go together with a modelVersion bump
  if (mappingsUpdated(from, to) && to.modelVersions.length === from.modelVersions.length) {
    throw new Error(
      `❌ The '${name}' SO type has changes in the mappings, but is missing a modelVersion that defines these changes.`
    );
  }

  // validate that newly added mapping fields are declared in the new model version
  validateNewMappingsInModelVersion(name, from, to);

  // validate that new mappings do not use index: false or enabled: false
  if (to.modelVersions.length > from.modelVersions.length) {
    const newModelVersion = to.modelVersions[to.modelVersions.length - 1];
    validateNoIndexOrEnabledFalse(name, to, [newModelVersion]);
  }

  // validate that name and title fields are of type "text"
  validateNameTitleFieldTypes(name, to);
}

interface ValidateChangesNewTypeParams {
  to: MigrationInfoRecord;
  registeredType: SavedObjectsType;
}

export function validateChangesNewType({ to, registeredType }: ValidateChangesNewTypeParams): void {
  const name = to.name;

  if (to.migrationVersions?.length) {
    throw new Error(`❌ New SO type ${name} cannot define legacy 'migrations'.`);
  }

  if (!to.modelVersions?.length) {
    throw new Error(`❌ New SO type ${name} must define the first model version '1'.`);
  }

  // check that the last modelVersion has schemas and that schemas have both create and forwardCompatibility defined
  validateModelVersionNumbers(name, to.modelVersions);

  // check that defined modelVersions are consecutive integer numbers, starting at 1
  validateLastModelVersion(name, to.modelVersions);

  // validate that all mapping fields are present in the latest model version schema
  validateAllMappingsInModelVersion(name, to, registeredType);

  // validate that new mappings do not use index: false or enabled: false
  validateNoIndexOrEnabledFalse(name, to, to.modelVersions);

  // validate that name and title fields are of type "text"
  validateNameTitleFieldTypes(name, to);
}

function validateModelVersionNumbers(name: string, mvs: ModelVersionSummary[]) {
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

function validateLastModelVersion(name: string, mvs: ModelVersionSummary[]) {
  const mv = mvs[mvs.length - 1];
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
  if (mvs.length === 1 && mv.changeTypes.length) {
    // Do NOT allow changes in the first (initial) modelVersion, only schema additions.
    // This guarantees rollback safety towards previous versions.
    throw new Error(
      `❌ The new model version '${mv.version}' for SO type '${name}' is defining mappings' changes. For backwards-compatibility reasons, the initial model version can only include schema definitions.`
    );
  }
}

function getMutatedModelVersions(
  infoBefore: MigrationInfoRecord,
  infoAfter: MigrationInfoRecord
): string[] {
  const mutatedModelVersions = infoBefore.modelVersions.filter((summaryBefore, index) => {
    const summaryAfter = infoAfter.modelVersions[index];

    if (!summaryBefore.modelVersionHash) {
      // TODO remove this conditional when all the baseline snapshots have the new hash properties
      // we're comparing against an old snapshot, downgrade the infoAfter one to match the old format
      const to: Partial<ModelVersionSummary> = cloneDeep(summaryAfter);
      delete to.modelVersionHash;
      // @ts-ignore we're simulating an older version of the type without the new properties
      delete to.schemas.create;
      // @ts-ignore we're simulating an older version of the type without the new properties
      to.schemas.forwardCompatibility = Boolean(to.schemas.forwardCompatibility);
      return !equal(summaryBefore, to);
    } else {
      // comparing old snapshot with new snapshot, both have the new hash properties
      return !equal(summaryBefore, infoAfter.modelVersions[index]);
    }
  });
  return mutatedModelVersions.map(({ version }) => `10.${version}.0`);
}

function mappingsUpdated(infoBefore: MigrationInfoRecord, infoAfter: MigrationInfoRecord): boolean {
  return !equal(infoBefore.mappings, infoAfter.mappings);
}

/**
 * Extracts field paths from flattened ES mapping keys (e.g. properties.foo.type, properties.bar.properties.baz.type).
 * Returns paths in ES format (e.g. "bar.properties.baz" for nested).
 */
function getMappingFieldPaths(mappings: Record<string, unknown>): string[] {
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
function toSchemaPathFormat(mappingPath: string): string {
  return mappingPath.replace(/\.properties\./g, '.');
}

function validateNewMappingsInModelVersion(
  name: string,
  from: MigrationInfoRecord,
  to: MigrationInfoRecord
): void {
  if (to.modelVersions.length <= from.modelVersions.length) {
    return;
  }

  const newMappingFields = difference(
    getMappingFieldPaths(to.mappings),
    getMappingFieldPaths(from.mappings)
  );
  if (newMappingFields.length === 0) {
    return;
  }

  const newModelVersion = to.modelVersions[to.modelVersions.length - 1];
  const declaredMappings = new Set(
    newModelVersion.newMappings.map((m) => {
      const lastDot = m.lastIndexOf('.');
      return lastDot > 0 ? m.slice(0, lastDot) : m;
    })
  );

  const undeclaredFields = newMappingFields.filter((field) => !declaredMappings.has(field));
  if (undeclaredFields.length > 0) {
    throw new Error(
      `❌ The SO type '${name}' has new mapping fields that are not declared in model version '${
        newModelVersion.version
      }': ${undeclaredFields.join(', ')}. ` +
        `All new mapping fields must be declared via 'mappings_addition' changes in the corresponding model version.`
    );
  }
}

function validateAllMappingsInModelVersion(
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

function validateNoIndexOrEnabledFalse(
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

function validateNameTitleFieldTypes(name: string, to: MigrationInfoRecord): void {
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
