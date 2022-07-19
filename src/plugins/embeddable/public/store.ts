/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import type { Reducer, Store } from 'redux';
import { filter } from 'rxjs';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { EmbeddableInput, IEmbeddable } from './lib';

export const slice = createSlice({
  name: 'embeddable',
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
    setSyncTooltips(state, action: PayloadAction<EmbeddableInput['syncTooltips']>) {
      state.syncTooltips = action.payload;
    },
    setTitle(state, action: PayloadAction<EmbeddableInput['title']>) {
      state.title = action.payload;
    },
    setViewMode(state, action: PayloadAction<EmbeddableInput['viewMode']>) {
      state.viewMode = action.payload;
    },
    set(state, action: PayloadAction<EmbeddableInput>) {
      return action.payload;
    },
    update(state, action: PayloadAction<EmbeddableInput>) {
      return { ...state, ...action.payload };
    },
  },
});

export const { actions } = slice;

export function createStore(
  embeddable: IEmbeddable,
  reducer: Reducer<EmbeddableInput> = slice.reducer
): Store<EmbeddableInput> {
  let isUpstreamUpdate = false;
  let isDownstreamUpdate = false;

  const store = configureStore({ reducer });
  const onUpdate = debounce(() => {
    isDownstreamUpdate = true;
    embeddable.updateInput(store.getState());
    isDownstreamUpdate = false;
  });
  const unsubscribe = store.subscribe(() => !isUpstreamUpdate && onUpdate());

  embeddable
    .getInput$()
    .pipe(filter(() => !isDownstreamUpdate))
    .subscribe({
      next: () => {
        isUpstreamUpdate = true;
        store.dispatch(actions.set(embeddable.getInput()));
        isUpstreamUpdate = false;
      },
      complete: unsubscribe,
    });

  return store;
}
