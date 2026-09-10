/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationBaseState } from '../migration_state';
import { assertInvariant, clause } from '../invariant_helper';

export const Name = 'FATAL' as const;

export interface State extends MigrationBaseState {
  readonly name: typeof Name;
  readonly reason: string;
  readonly throwDelayMillis?: number;
}

export const assertInvariants = (state: State): void => {
  assertInvariant(state.reason.length > 0, clause(Name, 'requires reason'));
};
