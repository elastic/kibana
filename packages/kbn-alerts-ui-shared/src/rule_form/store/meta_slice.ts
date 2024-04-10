/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSlice } from '@reduxjs/toolkit';
import { setParam } from '../features/rule_definition';

const initialState: {
  haveRuleParamsChanged: boolean;
  hasExpressionParamsComponentBeenInteractedWith: boolean;
} = {
  hasExpressionParamsComponentBeenInteractedWith: false,
  haveRuleParamsChanged: false,
};

export const metaSlice = createSlice({
  name: 'meta',
  initialState,
  reducers: {
    expressionFocus(state) {
      state.hasExpressionParamsComponentBeenInteractedWith = true;
    },
  },
  extraReducers(builder) {
    builder.addCase(setParam, (state) => {
      if (state.hasExpressionParamsComponentBeenInteractedWith) state.haveRuleParamsChanged = true;
    });
  },
});

export const { expressionFocus } = metaSlice.actions;
