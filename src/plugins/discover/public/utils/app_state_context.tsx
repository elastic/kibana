/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Context, createContext } from 'react';
import type { AppState, GetStateReturn } from '../application/types';

export interface AppStateContext<T, S> {
  state: T;
  stateContainer: S;
}

type CreateAppContext = <T extends AppState, S extends GetStateReturn<T>>(
  value: AppStateContext<T, S>
) => Context<AppStateContext<T, S>>;

export const createAppContext: CreateAppContext = (value) => createContext(value);
