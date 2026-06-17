/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateName } from './state';

export class MigrationInvariantViolation extends Error {
  constructor(message: string) {
    super(`Invalid v3 migration state: ${message}`);
    this.name = 'MigrationInvariantViolation';
  }
}

export const assertInvariant = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new MigrationInvariantViolation(message);
  }
};

export const clause = (stateName: StateName, claim: string): string =>
  `invariant: ${stateName}: ${claim}`;
