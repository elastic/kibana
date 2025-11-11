/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import equal from 'fast-deep-equal';
import { cloneDeep } from 'lodash';
import type { MigrationInfoRecord, ModelVersionSummary } from '../types';

interface ValidateChangesParams {
  from?: MigrationInfoRecord;
  to: MigrationInfoRecord;
}

interface ValidateChangesExistingTypeParams {
  from: MigrationInfoRecord;
  to: MigrationInfoRecord;
}

interface ValidateChangesNewTypeParams {
  to: MigrationInfoRecord;
}

export function validateChanges({ from, to }: ValidateChangesParams): void {
  return from ? validateChangesExistingType({ from, to }) : validateChangesNewType({ to });
}

function validateChangesExistingType({ from, to }: ValidateChangesExistingTypeParams): void {
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
    throw new Error(
      `❌ The SO type '${name}' is defining two (or more) new model versions. Please refer to our troubleshooting guide: https://docs.elastic.dev/kibana-dev-docs/tutorials/saved-objects#troubleshooting`
    );
  }

  // check that the new modelVersion has schemas and that schemas have both create and forwardCompatibility defined
  if (to.modelVersions.length > from.modelVersions.length) {
    const newModelVersion = to.modelVersions[to.modelVersions.length - 1];
    validateNewModelVersion(newModelVersion);
  }

  // check that existing model versions have not been mutated
  const mutatedModelVersions = getMutatedModelVersions(from, to);
  if (mutatedModelVersions.length > 0) {
    throw new Error(
      `❌ Some modelVersions have been updated for SO type '${name}' after they were defined: ${mutatedModelVersions}.`
    );
  }

  // check that defined modelVersions are consecutive integer numbers, starting at 1
  to.modelVersions
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

  // ensure that updates in mappings go together with a modelVersion bump
  if (mappingsUpdated(from, to) && to.modelVersions.length === from.modelVersions.length) {
    throw new Error(
      `❌ The '${name}' SO type has changes in the mappings, but is missing a modelVersion that defines these changes.`
    );
  }
}

function validateChangesNewType({ to }: ValidateChangesNewTypeParams): void {
  const name = to.name;

  if (to.migrationVersions?.length) {
    throw new Error(`❌ New SO types cannot define legacy 'migrations'.`);
  }

  if (!to.modelVersions?.length) {
    throw new Error(`❌ New SO types must define the first model version '1'.`);
  }

  if (to.modelVersions?.length > 1) {
    throw new Error(
      `❌ The SO type '${name}' is defining two (or more) new model versions. Please refer to our troubleshooting guide: https://docs.elastic.dev/kibana-dev-docs/tutorials/saved-objects#troubleshooting`
    );
  }

  if (to.modelVersions[0].version !== '1') {
    throw new Error(
      `❌ Invalid model version '${to.modelVersions[0].version}' for SO type '${name}'. Model versions must be consecutive integer numbers starting at 1.`
    );
  }

  validateNewModelVersion(to.modelVersions[0]);
}

function validateNewModelVersion(mv: ModelVersionSummary) {
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
