/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';
import { EuiRangeTick } from '@elastic/eui/src/components/form/range/range_ticks';
import { TimeSliderReduxState } from './types';

export const timeSliderReducers = {
  publishValue: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<{ value?: [number, number] }>
  ) => {
    state.output.timeslice = action.payload.value;
  },
  setTimeRangeBounds: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<{ timeRangeBounds: [number, number]; ticks: EuiRangeTick[] }>
  ) => {
    state.componentState.ticks = action.payload.ticks;
    state.componentState.timeRangeBounds = action.payload.timeRangeBounds;
  },
  setValue: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<{ value?: [number, number] }>
  ) => {
    state.explicitInput.value = action.payload.value;
  },
  setRange: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<{ range?: number }>
  ) => {
    state.componentState.range = action.payload.range;
  },
};
