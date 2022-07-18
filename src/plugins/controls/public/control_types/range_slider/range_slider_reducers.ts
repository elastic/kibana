/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';
import { DataViewField, DataView } from '@kbn/data-views-plugin/common';

import { RangeSliderComponentState, RangeSliderReduxState, RangeValue } from './types';

export const getDefaultComponentState = () => ({
  min: '',
  max: '',
  loading: true,
  isInvalid: false,
  fieldFormatter: (value: string) => value,
});

export const rangeSliderReducers = {
  setSelectedRange: (
    state: WritableDraft<RangeSliderReduxState>,
    action: PayloadAction<RangeValue>
  ) => {
    state.input.value = action.payload;
  },
  setFieldAndFormatter: (
    state: WritableDraft<RangeSliderReduxState>,
    action: PayloadAction<{
      field?: DataViewField;
      fieldFormatter?: RangeSliderComponentState['fieldFormatter'];
    }>
  ) => {
    state.componentState.field = action.payload.field;
    state.componentState.fieldFormatter =
      action.payload.fieldFormatter ?? ((value: string) => value);
  },
  setDataView: (
    state: WritableDraft<RangeSliderReduxState>,
    action: PayloadAction<DataView | undefined>
  ) => {
    state.output.dataViews = action.payload ? [action.payload] : [];
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
