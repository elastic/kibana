/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { hydrateState } from '../common/constants';
import { setParam, selectAreAdvancedOptionsSet } from '../features/rule_definition';

const initialState: {
  haveRuleParamsChanged: boolean;
  hasExpressionParamsComponentBeenInteractedWith: boolean;
  areAdvancedOptionsVisible: boolean;
} = {
  hasExpressionParamsComponentBeenInteractedWith: false,
  haveRuleParamsChanged: false,
  areAdvancedOptionsVisible: false,
};

export const metaSlice = createSlice({
  name: 'meta',
  initialState,
  reducers: {
    expressionFocus(state) {
      state.hasExpressionParamsComponentBeenInteractedWith = true;
    },
    setAdvancedOptionsVisible(state, { payload }: PayloadAction<boolean>) {
      state.areAdvancedOptionsVisible = payload;
    },
  },
  extraReducers(builder) {
    builder.addCase(setParam, (state) => {
      if (state.hasExpressionParamsComponentBeenInteractedWith) state.haveRuleParamsChanged = true;
    });
    builder.addCase(hydrateState, (state, { payload }) => {
      state.areAdvancedOptionsVisible = selectAreAdvancedOptionsSet(payload);
    });
  },
});

export const { expressionFocus, setAdvancedOptionsVisible } = metaSlice.actions;
