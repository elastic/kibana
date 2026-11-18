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
  const { generalAccess, defaultGeneralAccess, entryAccess, operations } = policy;

  if (generalAccess.length === 0 || generalAccess.some((value) => !isGeneralAccessLevel(value))) {
    throw new Error(
      `General access must allow one or more values below "manage", got [${generalAccess}].`
    );
  }

  if (!generalAccess.includes(defaultGeneralAccess)) {
    throw new Error(
      `Default general access "${defaultGeneralAccess}" is not one of the allowed values.`
    );
  }

  if (entryAccess.length === 0 || entryAccess.some((value) => !isEntryLevel(value))) {
    throw new Error(`Entry access must be a non-empty list of values other than "none".`);
  }

  for (const operation of REQUIRED_OPERATIONS) {
    if (!operations[operation]) {
      throw new Error(`Operation "${operation}" must be defined.`);
    }
  }

  if (operations.view.access !== 'view') {
    throw new Error(`Operation "view" must require "view" access.`);
  }

  for (const [name, operation] of Object.entries(operations)) {
    if (isReservedOperation(name)) {
      throw new Error(`Operation "${name}" is reserved by the platform.`);
    }

    if (!isEntryLevel(operation.access)) {
      throw new Error(`Operation "${name}" has invalid access "${operation.access}".`);
    }
  }
};
