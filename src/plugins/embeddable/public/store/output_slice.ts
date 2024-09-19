/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { EmbeddableOutput } from '../lib';

export const output = createSlice({
  name: 'output',
  initialState: {} as EmbeddableOutput,
  reducers: {
    setLoading(state, action: PayloadAction<EmbeddableOutput['loading']>) {
      state.loading = action.payload;
    },
    setRendered(state, action: PayloadAction<EmbeddableOutput['rendered']>) {
      state.rendered = action.payload;
    },
    setError(state, action: PayloadAction<EmbeddableOutput['error']>) {
      state.error = action.payload;
    },
    setEditUrl(state, action: PayloadAction<EmbeddableOutput['editUrl']>) {
      state.editUrl = action.payload;
    },
    setEditApp(state, action: PayloadAction<EmbeddableOutput['editApp']>) {
      state.editApp = action.payload;
    },
    setEditPath(state, action: PayloadAction<EmbeddableOutput['editPath']>) {
      state.editPath = action.payload;
    },
    setDefaultTitle(state, action: PayloadAction<EmbeddableOutput['defaultTitle']>) {
      state.defaultTitle = action.payload;
    },
    setTitle(state, action: PayloadAction<EmbeddableOutput['title']>) {
      state.title = action.payload;
    },
    setEditable(state, action: PayloadAction<EmbeddableOutput['editable']>) {
      state.editable = action.payload;
    },
    setSavedObjectId(state, action: PayloadAction<EmbeddableOutput['savedObjectId']>) {
      state.savedObjectId = action.payload;
    },
    update(state, action: PayloadAction<Partial<EmbeddableOutput>>) {
      return { ...state, ...action.payload };
    },
  },
});
