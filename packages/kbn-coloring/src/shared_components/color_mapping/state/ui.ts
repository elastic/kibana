/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from './color_mapping';

const initialState: RootState['ui'] = {
  colorPicker: {
    index: 0,
    visibile: false,
    type: 'assignment',
  },
};

export const uiSlice = createSlice({
  name: 'colorMapping',
  initialState,
  reducers: {
    colorPickerVisibility: (
      state,
      action: PayloadAction<{
        index: number;
        type: RootState['ui']['colorPicker']['type'];
        visible: boolean;
      }>
    ) => {
      state.colorPicker.visibile = action.payload.visible;
      state.colorPicker.index = action.payload.index;
      state.colorPicker.type = action.payload.type;
    },
    switchColorPickerVisibility: (state) => {
      state.colorPicker.visibile = !state.colorPicker.visibile;
    },
    showColorPickerVisibility: (state) => {
      state.colorPicker.visibile = true;
    },
    hideColorPickerVisibility: (state) => {
      state.colorPicker.visibile = false;
    },
  },
});

export const {
  colorPickerVisibility,
  switchColorPickerVisibility,
  showColorPickerVisibility,
  hideColorPickerVisibility,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
