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
import type { OptionsListComponentState } from '../data_controls/options_list_control/types';

export type ESQLControlApi = DefaultControlApi &
  PublishesESQLVariable &
  HasEditCapabilities &
  Pick<Required<PublishesTitle>, 'defaultTitle$'> &
  PublishesDataLoading;

type HideExcludeUnusedState = Pick<OptionsListComponentState, 'exclude'>;
type HideExistsUnusedState = Pick<OptionsListComponentState, 'existsSelected'>;
type HideSortUnusedState = Pick<OptionsListComponentState, 'sort'>;
type DisableLoadSuggestionsUnusedState = Pick<
  OptionsListComponentState,
  'dataLoading' | 'requestSize' | 'runPastTimeout'
>;
type DisableInvalidSelectionsUnusedState = Pick<OptionsListComponentState, 'invalidSelections'>;

export type OptionsListESQLUnusedState = HideExcludeUnusedState &
  HideExistsUnusedState &
  HideSortUnusedState &
  DisableLoadSuggestionsUnusedState &
  DisableInvalidSelectionsUnusedState &
  Pick<OptionsListComponentState, 'fieldName'>;
