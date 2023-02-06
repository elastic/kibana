/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { EmbeddableInput } from '../lib';

export const input = createSlice({
  name: 'input',
  initialState: {} as EmbeddableInput,
  reducers: {
    setDisabledActions(state, action: PayloadAction<EmbeddableInput['disabledActions']>) {
      state.disabledActions = action.payload;
    },
    setDisableTriggers(state, action: PayloadAction<EmbeddableInput['disableTriggers']>) {
      state.disableTriggers = action.payload;
    },
    setEnhancements(state, action: PayloadAction<EmbeddableInput['enhancements']>) {
      state.enhancements = action.payload;
    },
    setExecutionContext(state, action: PayloadAction<EmbeddableInput['executionContext']>) {
      state.executionContext = action.payload;
    },
    setHidePanelTitles(state, action: PayloadAction<EmbeddableInput['hidePanelTitles']>) {
      state.hidePanelTitles = action.payload;
    },
    setLastReloadRequestTime(
      state,
      action: PayloadAction<EmbeddableInput['lastReloadRequestTime']>
    ) {
      state.lastReloadRequestTime = action.payload;
    },
    setSearchSessionId(state, action: PayloadAction<EmbeddableInput['searchSessionId']>) {
      state.searchSessionId = action.payload;
    },
    setSyncColors(state, action: PayloadAction<EmbeddableInput['syncColors']>) {
      state.syncColors = action.payload;
    },
    setSyncCursor(state, action: PayloadAction<EmbeddableInput['syncCursor']>) {
      state.syncCursor = action.payload;
    },
    setSyncTooltips(state, action: PayloadAction<EmbeddableInput['syncTooltips']>) {
      state.syncTooltips = action.payload;
    },
    setTitle(state, action: PayloadAction<EmbeddableInput['title']>) {
      state.title = action.payload;
    },
    setViewMode(state, action: PayloadAction<EmbeddableInput['viewMode']>) {
      state.viewMode = action.payload;
    },
    update(state, action: PayloadAction<Partial<EmbeddableInput>>) {
      return { ...state, ...action.payload };
    },
  },
});
