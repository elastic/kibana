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
  changeCollapsedWidthAction,
  changeExpandedWidthAction,
  resetCollapsedWidthAction,
  resetExpandedWidthAction,
} from './widths_actions';
import { initialState } from './widths_state';

export const widthsReducer = createReducer(initialState, (builder) => {
  builder.addCase(changeCollapsedWidthAction, (state, { payload: { width, id } }) => {
    if (id in state.widthsById) {
      state.widthsById[id].collapsedWidth = width;
    } else {
      state.widthsById[id] = {
        collapsedWidth: width,
      };
    }
  });

  builder.addCase(resetCollapsedWidthAction, (state, { payload: { id } }) => {
    if (id in state.widthsById) {
      state.widthsById[id].collapsedWidth = undefined;
    } else {
      state.widthsById[id] = {
        collapsedWidth: undefined,
      };
    }
  });

  builder.addCase(changeExpandedWidthAction, (state, { payload: { width, id } }) => {
    if (id in state.widthsById) {
      state.widthsById[id].expandedWidth = width;
    } else {
      state.widthsById[id] = {
        expandedWidth: width,
      };
    }
  });

  builder.addCase(resetExpandedWidthAction, (state, { payload: { id } }) => {
    if (id in state.widthsById) {
      state.widthsById[id].expandedWidth = undefined;
    } else {
      state.widthsById[id] = {
        expandedWidth: undefined,
      };
    }
  });
});
