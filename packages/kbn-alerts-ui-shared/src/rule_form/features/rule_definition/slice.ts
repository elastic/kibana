/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialState: {
  id: string;
  params: Record<string, unknown>;
} = {
  id: '',
  params: {},
};

export const ruleDefinitionSlice = createSlice({
  name: 'ruleDefinition',
  initialState,
  reducers: {
    setParam(state, { payload: [key, value] }: PayloadAction<[string, unknown]>) {
      state.params[key] = value;
    },
    replaceParams(state, { payload }: PayloadAction<Record<string, unknown>>) {
      state.params = payload;
    },
  },
});

export const ruleDefinitionReducer = ruleDefinitionSlice.reducer;
export const { setParam, replaceParams } = ruleDefinitionSlice.actions;
