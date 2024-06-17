/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { getInitialState } from '../stream_state';

export const dataSlice = createSlice({
  name: 'development',
  initialState: getInitialState(),
  reducers: {
    updateProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    addToEntity: (
      state,
      action: PayloadAction<{
        entity: string;
        value: number;
      }>
    ) => {
      const { entity, value } = action.payload;
      state.entities[entity] = (state.entities[entity] || 0) + value;
    },
    deleteEntity: (state, action: PayloadAction<string>) => {
      delete state.entities[action.payload];
    },
    error: (state, action: PayloadAction<string>) => {
      state.errors.push(action.payload);
    },
    reset: () => {
      return getInitialState();
    },
  },
});

export const { updateProgress, addToEntity, deleteEntity, error, reset } = dataSlice.actions;
export type ReduxStreamApiAction = ReturnType<
  typeof dataSlice.actions[keyof typeof dataSlice.actions]
>;
