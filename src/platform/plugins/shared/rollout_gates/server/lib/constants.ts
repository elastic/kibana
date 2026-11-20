/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ROLLOUT_GATE_SO_TYPE = 'rollout-gate';

/** Fixed id of the saved object that records the oldest build this project's ledger has seen. */
export const GENESIS_SO_ID = 'genesis';

/** Reserved; cannot be used as a gate id, since it would collide with the genesis record's label. */
export const GENESIS_RECORD_LABEL = '__genesis__';

export const MAX_GATE_ID_LENGTH = 200;
