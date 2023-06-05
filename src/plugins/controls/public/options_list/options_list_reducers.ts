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
import { FieldSpec } from '@kbn/data-views-plugin/common';

import {
  OptionsListReduxState,
  OptionsListComponentState,
  OptionsListStateFromControl,
} from './types';
import { getIpRangeQuery } from '../../common/options_list/ip_search';
import {
  OPTIONS_LIST_DEFAULT_SORT,
  OptionsListSortingType,
} from '../../common/options_list/suggestions_sorting';

export const getDefaultComponentState = (): OptionsListReduxState['componentState'] => ({
  popoverOpen: false,
  allowExpensiveQueries: true,
  searchString: { value: '', valid: true },
});

export const optionsListReducers = {
  deselectOption: (state: WritableDraft<OptionsListReduxState>, action: PayloadAction<string>) => {
    if (!state.componentState.selectedOptions) return;
    const itemIndex = state.componentState.selectedOptions.indexOf(action.payload);
    if (itemIndex !== -1) {
      const newSelections = [...state.componentState.selectedOptions];
      newSelections.splice(itemIndex, 1);
      state.componentState.selectedOptions = newSelections;
    }
  },
  setSearchString: (state: WritableDraft<OptionsListReduxState>, action: PayloadAction<string>) => {
    state.componentState.searchString.value = action.payload;
    if (
      action.payload !== '' && // empty string search is never invalid
      state.componentState.field?.type === 'ip' // only IP searches can currently be invalid
    ) {
      state.componentState.searchString.valid = getIpRangeQuery(action.payload).validSearch;
    }
  },
  setAllowExpensiveQueries: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<boolean>
  ) => {
    state.componentState.allowExpensiveQueries = action.payload;
  },
  setPopoverOpen: (state: WritableDraft<OptionsListReduxState>, action: PayloadAction<boolean>) => {
    state.componentState.popoverOpen = action.payload;
  },
  setSort: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<Partial<OptionsListSortingType>>
  ) => {
    state.explicitInput.sort = {
      ...(state.explicitInput.sort ?? OPTIONS_LIST_DEFAULT_SORT),
      ...action.payload,
    };
  },
  setStateFromOptionsControl: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<OptionsListStateFromControl>
  ) => {
    state.explicitInput.selectedOptions = action.payload.selectedOptions ?? [];
    if (action.payload.existsSelected !== undefined)
      state.explicitInput.existsSelected = action.payload.existsSelected;
  },
  selectExists: (state: WritableDraft<OptionsListReduxState>, action: PayloadAction<boolean>) => {
    if (action.payload) {
      state.componentState.existsSelected = true;
      state.componentState.selectedOptions = [];
    } else {
      state.componentState.existsSelected = false;
    }
  },
  selectOption: (state: WritableDraft<OptionsListReduxState>, action: PayloadAction<string>) => {
    if (!state.componentState.selectedOptions) state.componentState.selectedOptions = [];
    if (state.componentState.existsSelected) state.componentState.existsSelected = false;
    state.componentState.selectedOptions?.push(action.payload);
  },
  replaceSelection: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<string>
  ) => {
    state.componentState.selectedOptions = [action.payload];
    if (state.componentState.existsSelected) state.componentState.existsSelected = false;
  },
  clearSelections: (state: WritableDraft<OptionsListReduxState>) => {
    if (state.componentState.existsSelected) state.componentState.existsSelected = false;
    if (state.componentState.selectedOptions) state.componentState.selectedOptions = [];
  },
  setExclude: (state: WritableDraft<OptionsListReduxState>, action: PayloadAction<boolean>) => {
    state.explicitInput.exclude = action.payload;
  },
  clearValidAndInvalidSelections: (state: WritableDraft<OptionsListReduxState>) => {
    state.componentState.invalidSelections = [];
    state.componentState.validSelections = [];
  },
  setValidAndInvalidSelections: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<{
      validSelections: string[];
      invalidSelections: string[];
    }>
  ) => {
    const { invalidSelections, validSelections } = action.payload;
    state.componentState.invalidSelections = invalidSelections;
    state.componentState.validSelections = validSelections;
  },
  setErrorMessage: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<string | undefined>
  ) => {
    state.componentState.error = action.payload;
  },
  setLoading: (state: WritableDraft<OptionsListReduxState>, action: PayloadAction<boolean>) => {
    state.output.loading = action.payload;
  },
  setField: (
    state: WritableDraft<OptionsListReduxState>,
    action: PayloadAction<FieldSpec | undefined>
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
    state.componentState = {
      ...(state.componentState ?? {}),
      ...action.payload,
    };
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
