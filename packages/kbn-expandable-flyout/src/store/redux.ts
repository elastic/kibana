/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext } from 'react';
import { createDispatchHook, createSelectorHook, ReactReduxContextValue } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { internalPercentagesMiddleware } from './internal_percentages_middleware';
import { widthsMiddleware } from './widths_middleware';
import { pushVsOverlayMiddleware } from './push_vs_overlay_middleware';
import { panelsReducer } from './panels_reducer';
import { internalPercentagesReducer } from './internal_percentages_reducer';
import { defaultWidthsReducer } from './default_widths_reducer';
import { pushVsOverlayReducer } from './push_vs_overlay_reducer';
import { widthsReducer } from './widths_reducer';
import { initialState, State } from './state';

export const store = configureStore({
  reducer: {
    panels: panelsReducer,
    pushVsOverlay: pushVsOverlayReducer,
    widths: widthsReducer,
    defaultWidths: defaultWidthsReducer,
    internalPercentages: internalPercentagesReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
  middleware: [pushVsOverlayMiddleware, widthsMiddleware, internalPercentagesMiddleware],
});

export const Context = createContext<ReactReduxContextValue<State>>({
  store,
  storeState: initialState,
});

export const useDispatch = createDispatchHook(Context);
export const useSelector = createSelectorHook(Context);

const stateSelector = (state: State) => state;

const panelsSelector = createSelector(stateSelector, (state) => state.panels);
const pushVsOverlaySelector = createSelector(stateSelector, (state) => state.pushVsOverlay);
const widthsSelector = createSelector(stateSelector, (state) => state.widths);
const internalPercentagesSelector = createSelector(
  stateSelector,
  (state) => state.internalPercentages
);
const defaultWidthsSelector = createSelector(stateSelector, (state) => state.defaultWidths);

export const selectPanelsById = (id: string) =>
  createSelector(panelsSelector, (state) => state.panelsById[id] || {});

export const selectNeedsSync = () => createSelector(panelsSelector, (state) => state.needsSync);

export const selectPushVsOverlayById = (id: string) =>
  createSelector(pushVsOverlaySelector, (state) => state.pushVsOverlayById[id] || 'overlay');

export const selectWidthsById = (id: string) =>
  createSelector(widthsSelector, (state) => state.widthsById[id] || {});

export const selectInternalPercentagesById = (id: string) =>
  createSelector(internalPercentagesSelector, (state) => state.internalPercentagesById[id] || {});

export const selectDefaultWidths = createSelector(
  defaultWidthsSelector,
  (state) => state.defaultWidths
);
