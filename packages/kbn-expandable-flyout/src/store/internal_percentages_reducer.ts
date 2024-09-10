/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createReducer } from '@reduxjs/toolkit';
import {
  changeInternalPercentagesAction,
  resetInternalPercentagesAction,
} from './internal_percentages_actions';
import { initialState } from './internal_percentages_state';

export const internalPercentagesReducer = createReducer(initialState, (builder) => {
  builder.addCase(changeInternalPercentagesAction, (state, { payload: { right, left, id } }) => {
    if (id in state.internalPercentagesById) {
      state.internalPercentagesById[id].internalLeftPercentage = left;
      state.internalPercentagesById[id].internalRightPercentage = right;
    } else {
      state.internalPercentagesById[id] = {
        internalLeftPercentage: left,
        internalRightPercentage: right,
      };
    }
  });

  builder.addCase(resetInternalPercentagesAction, (state, { payload: { id } }) => {
    if (id in state.internalPercentagesById) {
      state.internalPercentagesById[id].internalLeftPercentage = undefined;
      state.internalPercentagesById[id].internalRightPercentage = undefined;
    } else {
      state.internalPercentagesById[id] = {
        internalLeftPercentage: undefined,
        internalRightPercentage: undefined,
      };
    }
  });
});
