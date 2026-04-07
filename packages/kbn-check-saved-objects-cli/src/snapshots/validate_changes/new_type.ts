/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { MigrationInfoRecord } from '../../types';
import {
  validateAllMappingsInModelVersion,
  validateNewModelVersionSchemas,
  validateModelVersionNumbers,
  validateNoIndexOrEnabledFalseInAllMappings,
  getLatestModelVersion,
  validateInitialModelVersion,
  getFirstModelVersion,
} from './common_utils';
import { validateNameTitleFieldTypesNewType } from './new_type_utils';

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

  // check that the initial model version only has schemas
  validateInitialModelVersion(name, getFirstModelVersion(to));

  // check that defined modelVersions are consecutive integer numbers, starting at 1
  validateModelVersionNumbers(name, to.modelVersions);

  // check that the last modelVersion has schemas and that schemas have both create and forwardCompatibility defined
  validateNewModelVersionSchemas(name, getLatestModelVersion(to));

  // validate that all mapping fields are present in the latest model version schema
  validateAllMappingsInModelVersion(name, to, registeredType);

  // validate that no mapping field uses index: false or enabled: false
  validateNoIndexOrEnabledFalseInAllMappings(name, to);

  // validate that name and title fields are of type "text"
  validateNameTitleFieldTypesNewType(name, to, registeredType);
}
