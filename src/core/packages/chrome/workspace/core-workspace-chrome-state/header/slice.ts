/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface HeaderState {
  homeHref: string;
}

const initialHeaderState: HeaderState = {
  homeHref: '/app/home',
};

export const headerSlice = createSlice({
  name: 'header',
  initialState: initialHeaderState,
  reducers: {
    setHomeHref: (state, action: PayloadAction<string>) => {
      state.homeHref = action.payload;
    },
  },
});

export const { setHomeHref } = headerSlice.actions;

export const headerReducer = headerSlice.reducer;
