/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ACL_LEVELS,
  REQUIRED_OPERATIONS,
  RESERVED_OPERATIONS,
  type AccessPolicy,
  type EntryLevel,
} from './types';

/**
 * Throws when a policy cannot be enforced consistently. Types call it once, at registration.
 */
export const validateAccessPolicy = (policy: AccessPolicy) => {
  const { generalAccess, entryLevels, operations } = policy;

  if (
    generalAccess.allowed.length === 0 ||
    generalAccess.allowed.some(
      (level) => !ACL_LEVELS.includes(level) || (level as string) === 'manage'
    )
  ) {
    throw new Error(
      `General access must allow one or more levels below "manage", got [${generalAccess.allowed}].`
    );
  }

  if (!generalAccess.allowed.includes(generalAccess.default)) {
    throw new Error(
      `Default general access "${generalAccess.default}" is not one of the allowed levels.`
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
    if ((RESERVED_OPERATIONS as readonly string[]).includes(name)) {
      throw new Error(`Operation "${name}" is reserved by the platform.`);
    }

    if (!isEntryLevel(operation.level)) {
      throw new Error(`Operation "${name}" has an invalid level "${operation.level}".`);
    }
  }
};

const isEntryLevel = (level: string): level is EntryLevel =>
  level !== 'none' && (ACL_LEVELS as readonly string[]).includes(level);
