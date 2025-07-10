/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';

import type { PublishingSubject } from '@kbn/presentation-publishing';
import { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import type {
  OptionsListControlState,
  OptionsListDisplaySettings,
  OptionsListSelection,
  OptionsListSortingType,
  OptionsListSuggestions,
} from '../../../../common/options_list';
import type { DataControlApi } from '../types';
import { SelectionsState } from './selections_manager';
import { DefaultDataControlState } from '../../../../common';
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

export type OptionsListComponentApi = OptionsListControlApi &
  PublishesOptions &
  StateManager<DefaultDataControlState>['api'] &
  StateManager<EditorState>['api'] &
  StateManager<SelectionsState>['api'] &
  StateManager<TemporaryState>['api'] & {
    deselectOption: (key: string | undefined) => void;
    makeSelection: (key: string | undefined, showOnlySelected: boolean) => void;
    loadMoreSubject: Subject<void>;
    sort$: PublishingSubject<OptionsListSortingType | undefined>;
    setSort: (sort: OptionsListSortingType | undefined) => void;
    selectAll: (keys: string[]) => void;
    deselectAll: (keys: string[]) => void;
  };
