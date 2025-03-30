/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { DiscoverInternalState } from './types';
import type { InternalStateDispatch, InternalStateThunkDependencies } from './internal_state';

// For some reason if this is not explicitly typed, TypeScript fails with the following error:
// TS7056: The inferred type of this node exceeds the maximum length the compiler will serialize. An explicit type annotation is needed.
type CreateInternalStateAsyncThunk = ReturnType<
  typeof createAsyncThunk.withTypes<{
    state: DiscoverInternalState;
    dispatch: InternalStateDispatch;
    extra: InternalStateThunkDependencies;
  }>
>;

export const createInternalStateAsyncThunk: CreateInternalStateAsyncThunk =
  createAsyncThunk.withTypes();
