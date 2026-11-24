/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice } from '@reduxjs/toolkit';

import { getInitialState } from '../stream_state';
import {
  SLICE_NAME,
  addToEntity,
  deleteEntity,
  error,
  reset,
  updateProgress,
} from './data_actions';

export const dataSlice = createSlice({
  name: SLICE_NAME,
  initialState: getInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(updateProgress, (state, action) => {
        state.progress = action.payload;
      })
      .addCase(addToEntity, (state, action) => {
        const { entity, value } = action.payload;
        state.entities[entity] = (state.entities[entity] || 0) + value;
      })
      .addCase(deleteEntity, (state, action) => {
        delete state.entities[action.payload];
      })
      .addCase(error, (state, action) => {
        state.errors.push(action.payload);
      })
      .addCase(reset, () => getInitialState());
  },
});
