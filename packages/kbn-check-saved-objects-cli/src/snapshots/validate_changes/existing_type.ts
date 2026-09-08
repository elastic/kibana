/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import equal from 'fast-deep-equal';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { MigrationInfoRecord } from '../../types';
import { RULE_IDS, SavedObjectsCheckError } from '../../findings';
import {
  validateNewModelVersionSchemas,
  validateModelVersionNumbers,
  validateNoIndexOrEnabledFalse,
  getLatestModelVersion,
  validateInitialModelVersion,
} from './common_utils';
import {
  mappingsUpdated,
  validateNoStructuralModelVersionChanges,
  validateNewMappingsInModelVersion,
  validateIgnoreAboveExistingType,
  validateNameTitleFieldTypesExistingType,
} from './existing_type_utils';
import { validateAdditiveOnlyMappings } from './additive_only_mappings';

interface ValidateChangesExistingTypeParams {
  from: MigrationInfoRecord;
  to: MigrationInfoRecord;
  registeredType: SavedObjectsType;
  log: (message: string) => void;
}

export function validateChangesExistingType({
  from,
  to,
  registeredType,
  log,
}: ValidateChangesExistingTypeParams): void {
  const name = to.name;

  if (
    (from.migrationVersions && !to.migrationVersions) ||
    !equal(to.migrationVersions, from.migrationVersions)
  ) {
    throw new SavedObjectsCheckError({
      ruleId: RULE_IDS.EXISTING_TYPE_MUTATED_MIGRATIONS,
      severity: 'error',
      typeName: name,
      message: `Modifications have been detected in the '${name}.migrations'. This property is deprecated and no modifications are allowed.`,
      fixHint: `Revert any changes to '${name}.migrations' and use a model version instead.`,
      docsAnchor: '#defining-model-versions',
    });
  }

  if (
    (from.modelVersions && !to.modelVersions) ||
    to.modelVersions.length < from.modelVersions.length
  ) {
    throw new SavedObjectsCheckError({
      ruleId: RULE_IDS.EXISTING_TYPE_DELETED_MODEL_VERSIONS,
      severity: 'error',
      typeName: name,
      message: `Some model versions have been deleted for SO type '${name}'.`,
      fixHint: `Restore the missing model version(s); existing model versions cannot be deleted.`,
      docsAnchor: '#defining-model-versions',
    });
  }

  validateModelVersionNumbers(name, to.modelVersions);

  validateNameTitleFieldTypesExistingType(name, to, from, registeredType, log);

  // assert that no mapped property has been removed compared to the baseline snapshot
  validateAdditiveOnlyMappings(name, from.mappings, to.mappings);
  // validate that keyword and flattened fields have ignore_above
  validateIgnoreAboveExistingType(name, to, from, log);

  // Validate existing model versions for structural and schema-only mutations.
  // Structural mutations always throw; schema-only mutations are classified
  // with granular diffing (breaking → throw, warnings → log).
  validateNoStructuralModelVersionChanges(from, to, registeredType, log);

  const newModelVersionCount = to.modelVersions.length - from.modelVersions.length;

  switch (newModelVersionCount) {
    case 0:
      if (mappingsUpdated(from, to)) {
        throw new SavedObjectsCheckError({
          ruleId: RULE_IDS.EXISTING_TYPE_MAPPINGS_WITHOUT_NEW_MODEL_VERSION,
          severity: 'error',
          typeName: name,
          message: `The '${name}' SO type has changes in the mappings, but is missing a modelVersion that defines these changes.`,
          fixHint: `Add a new model version with a 'mappings_addition' change describing the new fields.`,
          docsAnchor: '#defining-model-versions',
        });
      }
      break;
    case 1: {
      const newModelVersion = getLatestModelVersion(to);

      if (to.modelVersions.length === 1) {
        validateInitialModelVersion(name, newModelVersion);
      }

      validateNewModelVersionSchemas(name, newModelVersion);

      validateNewMappingsInModelVersion(name, from, to);

      validateNoIndexOrEnabledFalse(name, to, [newModelVersion]);
      break;
    }
    default:
      throw new SavedObjectsCheckError({
        ruleId: RULE_IDS.EXISTING_TYPE_TOO_MANY_NEW_MODEL_VERSIONS,
        severity: 'error',
        typeName: name,
        message: `The SO type '${name}' is defining ${newModelVersionCount} new model versions, but can only define one at a time.`,
        fixHint: `Split the change across multiple PRs so each one introduces a single new model version.`,
        docsAnchor: '#defining-model-versions',
      });
  }
}
