/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subject } from 'rxjs';

import type { PublishesTitle, PublishingSubject } from '@kbn/presentation-publishing';
import type { SubjectsOf, SettersOf } from '@kbn/presentation-publishing/state_manager/types';
import type {
  OptionsListControlState,
  OptionsListDisplaySettings,
  OptionsListSelection,
  OptionsListSortingType,
  OptionsListSuggestions,
} from '../../../../common/options_list';
import type { DataControlApi, PublishesField } from '../types';
import type { SelectionsState } from './selections_manager';
import type { DefaultDataControlState } from '../../../../common';
import type { TemporaryState } from './temporay_state_manager';
import type { EditorState } from './editor_state_manager';

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
type OptionsListStateSetters = Partial<SettersOf<OptionsListState>> &
  SettersOf<Pick<OptionsListState, 'sort' | 'searchString' | 'requestSize' | 'exclude'>>;

export type OptionsListComponentApi = PublishesField &
  PublishesOptions &
  PublishesOptionsListState &
  Pick<PublishesTitle, 'title$'> &
  OptionsListStateSetters & {
    deselectOption: (key: string | undefined) => void;
    makeSelection: (key: string | undefined, showOnlySelected: boolean) => void;
    loadMoreSubject: Subject<void>;
    selectAll: (keys: string[]) => void;
    deselectAll: (keys: string[]) => void;
    defaultTitle$?: PublishingSubject<string | undefined>;
    uuid: string;
    parentApi: {
      allowExpensiveQueries$: PublishingSubject<boolean>;
    };
  };
