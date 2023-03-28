/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { InitState, State } from './types';
import type { MigratorContext } from '../context';

/**
 * Create the initial state to be used for the ZDT migrator.
 */
export const createInitialState = (context: MigratorContext): State => {
  const initialState: InitState = {
    controlState: 'INIT',
    logs: [],
    retryCount: 0,
    retryDelay: 0,
  };
  return initialState;
};
