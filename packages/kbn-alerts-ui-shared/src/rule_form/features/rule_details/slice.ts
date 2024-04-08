/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialState: {
  name: string;
  tags: string[];
} = {
  name: '',
  tags: [],
};

export const ruleDetailsSlice = createSlice({
  name: 'ruleDetails',
  initialState,
  reducers: {
    setRuleName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },
    addTag: (state, action: PayloadAction<string>) => {
      state.tags.push(action.payload);
    },
    setTags: (state, action: PayloadAction<string[]>) => {
      state.tags = action.payload;
    },
  },
});

export const { setRuleName, addTag, setTags } = ruleDetailsSlice.actions;
