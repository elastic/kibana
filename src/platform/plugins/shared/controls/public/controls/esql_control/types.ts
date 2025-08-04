/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { PublishesESQLVariable } from '@kbn/esql-types';
import type { HasEditCapabilities, PublishesTitle } from '@kbn/presentation-publishing';
import type { DefaultControlApi } from '../types';
import { OptionsListState } from '../data_controls/options_list_control/types';

export type ESQLControlApi = DefaultControlApi &
  PublishesESQLVariable &
  HasEditCapabilities &
  Pick<Required<PublishesTitle>, 'defaultTitle$'>;

type HideExcludeUnusedState = Pick<OptionsListState, 'exclude'>;
type HideExistsUnusedState = Pick<OptionsListState, 'existsSelected'>;
type HideSortUnusedState = Pick<OptionsListState, 'sort'>;
type DisableLoadSuggestionsUnusedState = Pick<
  OptionsListState,
  'dataLoading' | 'requestSize' | 'runPastTimeout'
>;
type DisableMultiSelectUnusedState = Pick<OptionsListState, 'singleSelect'>;
type DisableInvalidSelectionsUnusedState = Pick<OptionsListState, 'invalidSelections'>;

export type OptionsListESQLUnusedState = HideExcludeUnusedState &
  HideExistsUnusedState &
  HideSortUnusedState &
  DisableLoadSuggestionsUnusedState &
  DisableMultiSelectUnusedState &
  DisableInvalidSelectionsUnusedState &
  Pick<OptionsListState, 'fieldName'>;
