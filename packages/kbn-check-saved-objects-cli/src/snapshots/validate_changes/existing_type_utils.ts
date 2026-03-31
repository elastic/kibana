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
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { MigrationInfoRecord, ModelVersionSummary } from '../../types';
import {
  getMappingFieldPaths,
  validateAllMappingsInModelVersion,
  getLatestModelVersion,
  getInvalidNameTitleFields,
  isSearchableViaManagement,
} from './common_utils';

export function mappingsUpdated(
  infoBefore: MigrationInfoRecord,
  infoAfter: MigrationInfoRecord
): boolean {
  return !equal(infoBefore.mappings, infoAfter.mappings);
}

export function getMutatedModelVersions(
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

export function validateNoModelVersionChanges(
  from: MigrationInfoRecord,
  to: MigrationInfoRecord
): void {
  const mutatedModelVersions = getMutatedModelVersions(from, to);
  if (mutatedModelVersions.length > 0) {
    throw new Error(
      `❌ Some modelVersions have been updated for SO type '${to.name}' after they were defined: ${mutatedModelVersions}.`
    );
  }
}

export function validateModelVersionsChanges({
  from,
  to,
  registeredType,
  log,
}: {
  from: MigrationInfoRecord;
  to: MigrationInfoRecord;
  registeredType: SavedObjectsType;
  log: (message: string) => void;
}): void {
  const name = to.name;
  const mutatedModelVersions = getMutatedModelVersions(from, to);
  if (mutatedModelVersions.length === 0) {
    return;
  }

  const before = getLatestModelVersion(from);
  const after = to.modelVersions.find(({ version }) => version === before.version)!;
  const latestVersionBefore = `10.${before.version}.0`;

  if (
    mutatedModelVersions.length === 1 &&
    mutatedModelVersions[0] === latestVersionBefore &&
    isOnlySchemaMutated(before, after)
  ) {
    // Schema-only changes to the latest model version are allowed when mappings are not affected.
    // This covers cases where a schema validation constraint (e.g. maxSize) is added or tightened
    // without altering the underlying ES mappings. A new model version would only be required if
    // the mappings changed, since that is what triggers index operations during upgrades.
    validateAllMappingsInModelVersion(name, to, registeredType);
    log(
      `⚠️ WARNING: Schema-only changes detected in the latest model version of SO type '${name}'. ` +
        `This is an exceptional case where schema changes are allowed because the mappings have not been modified. ` +
        `Any future changes to the mappings will still require a proper model version bump.`
    );
  } else {
    throw new Error(
      `❌ Some modelVersions have been updated for SO type '${name}' after they were defined: ${mutatedModelVersions}.`
    );
  }
}

/**
 * Returns true if the changes between two model versions are limited to schemas
 * (create and/or forwardCompatibility). Structural fields such as changeTypes,
 * hasTransformation, and newMappings must be identical.
 */
function isOnlySchemaMutated(before: ModelVersionSummary, after: ModelVersionSummary): boolean {
  return (
    before.version === after.version &&
    equal(before.changeTypes, after.changeTypes) &&
    before.hasTransformation === after.hasTransformation &&
    equal(before.newMappings, after.newMappings)
  );
}

export function validateNewMappingsInModelVersion(
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

  const newModelVersion = getLatestModelVersion(to);
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

/**
 * Validates that `name` and `title` mapping fields use `type: text` on an **existing** SO type.
 * Types that are not searchable via the management page are exempt.
 *
 * A field type cannot be changed from 'keyword' to 'text' without reindexing, so when a field
 * with an incorrect type was already present in the baseline (`from`), a warning is emitted
 * instead of throwing. Only fields newly introduced with the wrong type cause a hard failure.
 */
export function validateNameTitleFieldTypesExistingType(
  name: string,
  to: MigrationInfoRecord,
  from: MigrationInfoRecord,
  registeredType: SavedObjectsType,
  log: (message: string) => void
): void {
  if (!isSearchableViaManagement(registeredType)) {
    return;
  }

  const invalidFields = getInvalidNameTitleFields(to);
  if (invalidFields.length === 0) {
    return;
  }

  const preExisting = invalidFields.filter(
    ({ fieldName }) => `properties.${fieldName}.type` in from.mappings
  );
  const newlyIntroduced = invalidFields.filter(
    ({ fieldName }) => !(`properties.${fieldName}.type` in from.mappings)
  );

  if (preExisting.length > 0) {
    log(
      `⚠️  The SO type '${name}' has pre-existing 'name' or 'title' fields with incorrect types: ${preExisting
        .map(({ description }) => description)
        .join(', ')}. ` +
        `These fields must be of type 'text' for Search API compatibility, but cannot be changed without reindexing existing data.`
    );
  }

  if (newlyIntroduced.length > 0) {
    throw new Error(
      `❌ The SO type '${name}' has 'name' or 'title' fields with incorrect types: ${newlyIntroduced
        .map(({ description }) => description)
        .join(', ')}. ` + `These fields must be of type 'text' for Search API compatibility.`
    );
  }
}
