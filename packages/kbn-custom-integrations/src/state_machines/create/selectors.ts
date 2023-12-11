/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CreateCustomIntegrationState } from './state_machine';

export const isValidSelector = (state: CreateCustomIntegrationState) =>
  state && state.matches('valid');

export const isSubmittingSelector = (state: CreateCustomIntegrationState) =>
  state && state.matches('submitting');

export const isUninitializedSelector = (state: CreateCustomIntegrationState) =>
  !state || state.matches('uninitialized');

export const hasFailedSelector = (state: CreateCustomIntegrationState) =>
  state && state.matches('failure');
