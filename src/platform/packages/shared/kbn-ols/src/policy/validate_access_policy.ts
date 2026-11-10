/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEntryLevel, isGeneralAccessLevel } from '../levels';
import { isReservedOperation, REQUIRED_OPERATIONS, type AccessPolicy } from './types';

/**
 * Validates a type's access policy. Types call it once, at registration.
 *
 * @param policy The policy to validate.
 * @throws When the policy cannot be enforced consistently, for example when it allows `manage` as
 * general access, misses a {@link REQUIRED_OPERATIONS} entry, or defines a reserved operation.
 */
export const validateAccessPolicy = (policy: AccessPolicy): void => {
  const { generalAccessLevels, defaultGeneralAccessLevel, entryLevels, operations } = policy;

  if (
    generalAccessLevels.length === 0 ||
    generalAccessLevels.some((level) => !isGeneralAccessLevel(level))
  ) {
    throw new Error(
      `General access must allow one or more levels below "manage", got [${generalAccessLevels}].`
    );
  }

  if (!generalAccessLevels.includes(defaultGeneralAccessLevel)) {
    throw new Error(
      `Default general access "${defaultGeneralAccessLevel}" is not one of the allowed levels.`
    );
  }

  if (entryLevels.length === 0 || entryLevels.some((level) => !isEntryLevel(level))) {
    throw new Error(`Entry levels must be a non-empty list of grantable levels.`);
  }

  for (const operation of REQUIRED_OPERATIONS) {
    if (!operations[operation]) {
      throw new Error(`Operation "${operation}" must be defined.`);
    }
  }

  if (operations.view.level !== 'view') {
    throw new Error(`Operation "view" must require the "view" level.`);
  }

  for (const [name, operation] of Object.entries(operations)) {
    if (isReservedOperation(name)) {
      throw new Error(`Operation "${name}" is reserved by the platform.`);
    }

    if (!isEntryLevel(operation.level)) {
      throw new Error(`Operation "${name}" has an invalid level "${operation.level}".`);
    }
  }
};
