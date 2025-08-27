/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { PublishesESQLVariable } from '@kbn/esql-types';
import type {
  HasEditCapabilities,
  PublishesDataLoading,
  PublishesTitle,
} from '@kbn/presentation-publishing';
import type { DefaultControlApi } from '../types';
import type { OptionsListManagedState } from '../data_controls/options_list_control/types';

export type ESQLControlApi = DefaultControlApi &
  PublishesESQLVariable &
  HasEditCapabilities &
  Pick<Required<PublishesTitle>, 'defaultTitle$'> &
  PublishesDataLoading;

type HideExcludeUnusedState = Pick<OptionsListManagedState, 'exclude'>;
type HideExistsUnusedState = Pick<OptionsListManagedState, 'existsSelected'>;
type HideSortUnusedState = Pick<OptionsListManagedState, 'sort'>;
type DisableLoadSuggestionsUnusedState = Pick<
  OptionsListManagedState,
  'dataLoading' | 'requestSize' | 'runPastTimeout'
>;
type DisableMultiSelectUnusedState = Pick<OptionsListManagedState, 'singleSelect'>;
type DisableInvalidSelectionsUnusedState = Pick<OptionsListManagedState, 'invalidSelections'>;

export type OptionsListESQLUnusedState = HideExcludeUnusedState &
  HideExistsUnusedState &
  HideSortUnusedState &
  DisableLoadSuggestionsUnusedState &
  DisableMultiSelectUnusedState &
  DisableInvalidSelectionsUnusedState;
