/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GENESIS_RECORD_LABEL, MAX_GATE_ID_LENGTH } from './constants';

/** Throws if `gateId` cannot be declared or looked up. */
export const assertValidGateId = (gateId: string): void => {
  if (typeof gateId !== 'string' || gateId.length === 0) {
    throw new Error('A rollout gate id must be a non-empty string.');
  }
  if (gateId.length > MAX_GATE_ID_LENGTH) {
    throw new Error(
      `Rollout gate id "${gateId}" exceeds the ${MAX_GATE_ID_LENGTH} character limit.`
    );
  }
  if (gateId === GENESIS_RECORD_LABEL) {
    throw new Error(
      `"${GENESIS_RECORD_LABEL}" is reserved and cannot be used as a rollout gate id.`
    );
  }
};
