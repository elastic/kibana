/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer/dist/types/types-external';

import { Filter } from '@kbn/es-query';

import { OptionsListField, OptionsListReduxState, OptionsListComponentState } from './types';

export const optionsListReducers = {
  deselectOption: (state: WritableDraft<OptionsListReduxState>, action: PayloadAction<string>) => {
    if (!state.explicitInput.selectedOptions) return;
    const itemIndex = state.explicitInput.selectedOptions.indexOf(action.payload);
    if (itemIndex !== -1) {
      const newSelections = [...state.explicitInput.selectedOptions];
      newSelections.splice(itemIndex, 1);
      state.explicitInput.selectedOptions = newSelections;
    }
  },
  deselectOptions: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<string[]>
  ) => {
    for (const optionToDeselect of action.payload) {
      if (!state.explicitInput.selectedOptions) return;
      const itemIndex = state.explicitInput.selectedOptions.indexOf(optionToDeselect);
      if (itemIndex !== -1) {
        const newSelections = [...state.explicitInput.selectedOptions];
        newSelections.splice(itemIndex, 1);
        state.explicitInput.selectedOptions = newSelections;
      }
    }
  },
  setSearchString: (state: WritableDraft<OptionsListReduxState>, action: PayloadAction<string>) => {
    state.componentState.searchString = action.payload;
  },
  selectOption: (state: WritableDraft<OptionsListReduxState>, action: PayloadAction<string>) => {
    if (!state.explicitInput.selectedOptions) state.explicitInput.selectedOptions = [];
    state.explicitInput.selectedOptions?.push(action.payload);
  },
  replaceSelection: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<string>
  ) => {
    state.explicitInput.selectedOptions = [action.payload];
  },
  clearSelections: (state: WritableDraft<OptionsListReduxState>) => {
    if (state.explicitInput.selectedOptions) state.explicitInput.selectedOptions = [];
  },
  clearValidAndInvalidSelections: (state: WritableDraft<OptionsListReduxState>) => {
    state.componentState.invalidSelections = [];
    state.componentState.validSelections = [];
  },
  setValidAndInvalidSelections: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<{ validSelections: string[]; invalidSelections: string[] }>
  ) => {
    const { invalidSelections, validSelections } = action.payload;
    state.componentState.invalidSelections = invalidSelections;
    state.componentState.validSelections = validSelections;
  },
  setLoading: (state: WritableDraft<OptionsListReduxState>, action: PayloadAction<boolean>) => {
    state.output.loading = action.payload;
  },
  setField: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<OptionsListField | undefined>
  ) => {
    state.componentState.field = action.payload;
  },
  updateQueryResults: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<
      Pick<
        OptionsListComponentState,
        'availableOptions' | 'invalidSelections' | 'validSelections' | 'totalCardinality'
      >
    >
  ) => {
    state.componentState = { ...(state.componentState ?? {}), ...action.payload };
  },
  publishFilters: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<Filter[] | undefined>
  ) => {
    state.output.filters = action.payload;
  },
  setDataViewId: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<string | undefined>
  ) => {
    state.output.dataViewId = action.payload;
  },
};
