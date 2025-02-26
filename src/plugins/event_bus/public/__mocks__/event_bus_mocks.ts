/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Mock interface and initial state for testing
export interface MockTestState {
  counter: number;
  text: string;
  flag: boolean;
  data: {
    items: string[];
  };
}

export const mockInitialState: () => MockTestState = () => ({
  counter: 0,
  text: '',
  flag: false,
  data: {
    items: [],
  },
});

// Create a test slice
export const mockTestSlice = createSlice({
  name: 'test',
  initialState: mockInitialState(),
  reducers: {
    increment: (state) => {
      state.counter += 1;
    },
    setText: (state, action: PayloadAction<string>) => {
      state.text = action.payload;
    },
    toggleFlag: (state) => {
      state.flag = !state.flag;
    },
    addItem: (state, action: PayloadAction<string>) => {
      state.data.items.push(action.payload);
    },
    reset: () => mockInitialState(),
  },
});
