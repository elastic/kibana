/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { SERVICE_MESSAGES, TECH_KEYED_ERROR_TYPES } from './errors';
export type { MessagePool } from './errors';
import { SERVICE_MESSAGES } from './errors';
import { SUCCESS } from './success';
import { STACK_TRACES } from './stack_traces';
import { OUTBOUND } from './outbound';

export const SERVICE = {
  request: {
    success: SUCCESS,
    messages: SERVICE_MESSAGES,
  },
  stackTraces: STACK_TRACES,
  serviceCalls: { outbound: OUTBOUND },
};
