/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createReducer } from '@reduxjs/toolkit';
import { setDefaultWidthsAction } from './default_widths_actions';
import { initialState } from './default_widths_state';

export const defaultWidthsReducer = createReducer(initialState, (builder) => {
  builder.addCase(setDefaultWidthsAction, (state, { payload: { right, left, preview } }) => {
    state.defaultWidths.rightWidth = right;
    state.defaultWidths.leftWidth = left;
    state.defaultWidths.previewWidth = preview;
    state.defaultWidths.rightPercentage = (right / (right + left)) * 100;
    state.defaultWidths.leftPercentage = (left / (right + left)) * 100;
    state.defaultWidths.previewPercentage = (right / (right + left)) * 100;
  });
});
