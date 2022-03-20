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
import { ControlGroupInput } from '../types';

export const controlGroupReducers = {
  setControlStyle: (
    state: WritableDraft<ControlGroupInput>,
    action: PayloadAction<ControlGroupInput['controlStyle']>
  ) => {
    state.controlStyle = action.payload;
  },
  setDefaultControlWidth: (
    state: WritableDraft<ControlGroupInput>,
    action: PayloadAction<ControlGroupInput['defaultControlWidth']>
  ) => {
    state.defaultControlWidth = action.payload;
  },
  setControlWidth: (
    state: WritableDraft<ControlGroupInput>,
    action: PayloadAction<{ width: ControlWidth; embeddableId: string }>
  ) => {
    state.panels[action.payload.embeddableId].width = action.payload.width;
  },
  setControlOrders: (
    state: WritableDraft<ControlGroupInput>,
    action: PayloadAction<{ ids: string[] }>
  ) => {
    action.payload.ids.forEach((id, index) => {
      state.panels[id].order = index;
    });
  },
};
