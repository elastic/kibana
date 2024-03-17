/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiRangeTick } from '@elastic/eui';
import { PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';

import { TimeSlice } from '../../common/types';
import { TimeSliderReduxState } from './types';

export const timeSliderReducers = {
  publishValue: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<{ value?: TimeSlice }>
  ) => {
    state.output.timeslice = action.payload.value;
  },
  setTimeRangeBounds: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<{
      format: string;
      stepSize: number;
      timeRangeBounds: [number, number];
      ticks: EuiRangeTick[];
    }>
  ) => {
    state.componentState.format = action.payload.format;
    state.componentState.stepSize = action.payload.stepSize;
    state.componentState.ticks = action.payload.ticks;
    state.componentState.timeRangeBounds = action.payload.timeRangeBounds;
  },
  setValueAsPercentageOfTimeRange: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<{
      timesliceStartAsPercentageOfTimeRange?: number;
      timesliceEndAsPercentageOfTimeRange?: number;
    }>
  ) => {
    state.explicitInput.timesliceStartAsPercentageOfTimeRange =
      action.payload.timesliceStartAsPercentageOfTimeRange;
    state.explicitInput.timesliceEndAsPercentageOfTimeRange =
      action.payload.timesliceEndAsPercentageOfTimeRange;
  },
  setValue: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<{
      value?: TimeSlice;
    }>
  ) => {
    state.componentState.value = action.payload.value;
  },
  setRange: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<{ range?: number }>
  ) => {
    state.componentState.range = action.payload.range;
  },
  setIsAnchored: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<{ isAnchored: boolean }>
  ) => {
    state.explicitInput.isAnchored = action.payload.isAnchored;
  },
  setIsOpen: (
    state: WritableDraft<TimeSliderReduxState>,
    action: PayloadAction<{ isOpen: boolean }>
  ) => {
    state.componentState.isOpen = action.payload.isOpen;
  },
};
