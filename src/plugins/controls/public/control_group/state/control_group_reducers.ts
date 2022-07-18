/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';

import { ControlWidth } from '../../types';
import { ControlGroupInput, ControlGroupReduxState } from '../types';

export const controlGroupReducers = {
  setControlStyle: (
    state: WritableDraft<ControlGroupReduxState>,
    action: PayloadAction<ControlGroupInput['controlStyle']>
  ) => {
    state.input.controlStyle = action.payload;
  },
  setDefaultControlWidth: (
    state: WritableDraft<ControlGroupReduxState>,
    action: PayloadAction<ControlGroupInput['defaultControlWidth']>
  ) => {
    state.input.defaultControlWidth = action.payload;
  },
  setDefaultControlGrow: (
    state: WritableDraft<ControlGroupReduxState>,
    action: PayloadAction<ControlGroupInput['defaultControlGrow']>
  ) => {
    state.input.defaultControlGrow = action.payload;
  },
  setControlWidth: (
    state: WritableDraft<ControlGroupReduxState>,
    action: PayloadAction<{ width: ControlWidth; embeddableId: string }>
  ) => {
    state.input.panels[action.payload.embeddableId].width = action.payload.width;
  },
  setControlGrow: (
    state: WritableDraft<ControlGroupReduxState>,
    action: PayloadAction<{ grow: boolean; embeddableId: string }>
  ) => {
    state.input.panels[action.payload.embeddableId].grow = action.payload.grow;
  },
  setControlOrders: (
    state: WritableDraft<ControlGroupReduxState>,
    action: PayloadAction<{ ids: string[] }>
  ) => {
    action.payload.ids.forEach((id, index) => {
      state.input.panels[id].order = index;
    });
  },
};
