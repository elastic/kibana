/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';

import type { PublishesTitle, PublishingSubject } from '@kbn/presentation-publishing';
import { SettersOf, SubjectsOf } from '@kbn/presentation-publishing/state_manager/types';
import { DefaultDataControlState } from '../../../../common';
import type {
  OptionsListControlState,
  OptionsListDisplaySettings,
  OptionsListSelection,
  OptionsListSortingType,
  OptionsListSuggestions,
} from '../../../../common/options_list';
import type { DataControlApi, PublishesField } from '../types';
import { SelectionsState } from './selections_manager';
import { TemporaryState } from './temporay_state_manager';
import { EditorState } from './editor_state_manager';

export type OptionsListControlApi = DataControlApi & {
  setSelectedOptions: (options: OptionsListSelection[] | undefined) => void;
};

export interface OptionsListComponentState
  extends Omit<OptionsListControlState, keyof OptionsListDisplaySettings> {
  searchString: string;
  searchStringValid: boolean;
  requestSize: number;
}

interface PublishesOptions {
  availableOptions$: PublishingSubject<OptionsListSuggestions | undefined>;
  invalidSelections$: PublishingSubject<Set<OptionsListSelection>>;
  totalCardinality$: PublishingSubject<number>;
}

export type OptionsListState = Pick<DefaultDataControlState, 'fieldName'> &
  SelectionsState &
  EditorState &
  TemporaryState & { sort: OptionsListSortingType | undefined };

type PublishesOptionsListState = SubjectsOf<OptionsListState>;
type SettableOptionsListStates = Pick<
  OptionsListState,
  'sort' | 'searchString' | 'requestSize' | 'exclude'
>;
type OptionsListStateSetters = SettersOf<SettableOptionsListStates>;

export type OptionsListComponentApi = PublishesField &
  PublishesOptions &
  Pick<PublishesTitle, 'title$'> &
  PublishesOptionsListState &
  OptionsListStateSetters & {
    deselectOption: (key: string | undefined) => void;
    makeSelection: (key: string | undefined, showOnlySelected: boolean) => void;
    loadMoreSubject: Subject<void>;
    selectAll: (keys: string[]) => void;
    deselectAll: (keys: string[]) => void;
    allowExpensiveQueries$: PublishingSubject<boolean>;
    defaultTitle$: PublishingSubject<string | undefined> | PublishingSubject<undefined>;
    uuid: string;
  };

type HideExcludeUnusedStateKeys = 'exclude';
type HideExistsUnusedStateKeys = 'existsSelected';
type HideSortUnusedStateKeys = 'sort';
type DisableLoadSuggestionsUnusedStateKeys = 'dataLoading' | 'requestSize' | 'runPastTimeout';
type DisableMultiSelectUnusedStateKeys = 'singleSelect';
type DisableInvalidSelectionsUnusedStateKeys = 'invalidSelections';

type OptionsListOptionalState = Pick<
  OptionsListState,
  | HideExcludeUnusedStateKeys
  | HideExistsUnusedStateKeys
  | HideSortUnusedStateKeys
  | DisableLoadSuggestionsUnusedStateKeys
  | DisableMultiSelectUnusedStateKeys
  | DisableInvalidSelectionsUnusedStateKeys
>;

export type PartialOptionsListComponentApi =
  | Partial<OptionsListComponentApi>
  | Exclude<
      OptionsListComponentApi,
      SettersOf<OptionsListOptionalState> | SubjectsOf<OptionsListOptionalState>
    >;
