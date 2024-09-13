/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WritableDraft } from 'immer/dist/types/types-external';
import { PayloadAction } from '@reduxjs/toolkit';

import { FieldSpec } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';

import { RangeSliderReduxState } from './types';
import { RangeValue } from '../../common/range_slider/types';

export const getDefaultComponentState = (): RangeSliderReduxState['componentState'] => ({
  isInvalid: false,
});

export const rangeSliderReducers = {
  setSelectedRange: (
    state: WritableDraft<RangeSliderReduxState>,
    action: PayloadAction<RangeValue>
  ) => {
    const [minSelection, maxSelection]: RangeValue = action.payload;
    if (
      minSelection === String(state.componentState.min) &&
      maxSelection === String(state.componentState.max)
    ) {
      state.explicitInput.value = undefined;
    } else {
      state.explicitInput.value = action.payload;
    }
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
  setErrorMessage: (
    state: WritableDraft<RangeSliderReduxState>,
    action: PayloadAction<string | undefined>
  ) => {
    state.componentState.error = action.payload;
  },
  setLoading: (state: WritableDraft<RangeSliderReduxState>, action: PayloadAction<boolean>) => {
    state.output.loading = action.payload;
  },
  setMinMax: (
    state: WritableDraft<RangeSliderReduxState>,
    action: PayloadAction<{ min?: number; max?: number }>
  ) => {
    if (action.payload.min !== undefined) state.componentState.min = Math.floor(action.payload.min);
    if (action.payload.max !== undefined) state.componentState.max = Math.ceil(action.payload.max);
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
