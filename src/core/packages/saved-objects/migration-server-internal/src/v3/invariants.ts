/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SUCCESSORS } from './types';
import type { State } from './state';
import * as CREATE_TARGET from './steps/create_target';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';
import * as MARK_READY from './steps/mark_ready';

const assertInvariant = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(`Invalid v3 migration state: ${message}`);
  }
};

// Defensive: catches runtime states that reached us through casts or untyped inputs.
const isKnownStateName = (name: State['name']): boolean =>
  Object.prototype.hasOwnProperty.call(SUCCESSORS, name);

export const assertInvariants = (state: State): void => {
  assertInvariant(isKnownStateName(state.name), `unknown state name ${state.name}`);
  assertInvariant(Number.isInteger(state.retryAttempts), 'retryAttempts must be an integer');
  assertInvariant(state.retryAttempts >= 0, 'retryAttempts must be greater than or equal to 0');
  assertInvariant(Number.isInteger(state.retryCount), 'retryCount must be an integer');
  assertInvariant(state.retryCount >= 0, 'retryCount must be greater than or equal to 0');
  assertInvariant(
    state.retryCount <= state.retryAttempts,
    'retryCount must not exceed retryAttempts'
  );
  assertInvariant(
    state.logs.every((log) => typeof log === 'string'),
    'logs must contain only strings'
  );

  if (state.name === CREATE_TARGET.Name) {
    assertInvariant(state.sourceIndex.length > 0, 'CREATE_TARGET requires sourceIndex');
  }

  if (state.name === MARK_READY.Name || state.name === DONE.Name) {
    assertInvariant(state.targetIndex.length > 0, `${state.name} requires targetIndex`);
  }

  if (state.name === FATAL.Name) {
    assertInvariant(state.reason.length > 0, 'FATAL requires reason');
  }
};
