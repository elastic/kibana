/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const getInitialState = () => ({
  simulateErrors: false,
  compressResponse: true,
  flushFix: false,
});

export const optionsSlice = createSlice({
  name: 'options',
  initialState: getInitialState(),
  reducers: {
    setSimulateErrors: (state, action: PayloadAction<boolean>) => {
      state.simulateErrors = action.payload;
    },
    setCompressResponse: (state, action: PayloadAction<boolean>) => {
      state.compressResponse = action.payload;
    },
    setFlushFix: (state, action: PayloadAction<boolean>) => {
      state.flushFix = action.payload;
    },
  },
});

export const { setSimulateErrors, setCompressResponse, setFlushFix } = optionsSlice.actions;
export type ReduxOptionsApiAction = ReturnType<
  (typeof optionsSlice.actions)[keyof typeof optionsSlice.actions]
>;
