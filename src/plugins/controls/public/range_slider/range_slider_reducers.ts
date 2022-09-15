/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WritableDraft } from 'immer/dist/types/types-external';
import { PayloadAction } from '@reduxjs/toolkit';

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';

import { RangeSliderReduxState } from './types';
import { RangeValue } from '../../common/range_slider/types';

export const getDefaultComponentState = (): RangeSliderReduxState['componentState'] => ({
  min: '',
  max: '',
  isInvalid: false,
});

export const rangeSliderReducers = {
  setSelectedRange: (
    state: WritableDraft<RangeSliderReduxState>,
    action: PayloadAction<RangeValue>
  ) => {
    state.explicitInput.value = action.payload;
  },
  setField: (
    state: WritableDraft<RangeSliderReduxState>,
    action: PayloadAction<FieldSpec | undefined>
  ) => {
    state.componentState.field = action.payload;
  },
  setDataViewId: (
    state: WritableDraft<RangeSliderReduxState>,
    action: PayloadAction<string | undefined>
  ) => {
    state.output.dataViewId = action.payload;
  },
  setLoading: (state: WritableDraft<RangeSliderReduxState>, action: PayloadAction<boolean>) => {
    state.output.loading = action.payload;
  },
  setMinMax: (
    state: WritableDraft<RangeSliderReduxState>,
    action: PayloadAction<{ min: string; max: string }>
  ) => {
    state.componentState.min = action.payload.min;
    state.componentState.max = action.payload.max;
  },
  publishFilters: (
    state: WritableDraft<RangeSliderReduxState>,
    action: PayloadAction<Filter[] | undefined>
  ) => {
    state.output.filters = action.payload;
  },
  setIsInvalid: (state: WritableDraft<RangeSliderReduxState>, action: PayloadAction<boolean>) => {
    state.componentState.isInvalid = action.payload;
  },
};
