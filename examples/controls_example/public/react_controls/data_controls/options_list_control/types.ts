/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OptionsListSearchTechnique } from '@kbn/controls-plugin/common/options_list/suggestions_searching';
import { OptionsListSortingType } from '@kbn/controls-plugin/common/options_list/suggestions_sorting';
import { OptionsListSuggestions } from '@kbn/controls-plugin/common/options_list/types';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { DataControlApi, DefaultDataControlState } from '../types';

export type OptionsListSelection = string | number;

export interface OptionsListDisplaySettings {
  placeholder?: string;
  hideActionBar?: boolean;
  hideExclude?: boolean;
  hideExists?: boolean;
  hideSort?: boolean;
}

export interface OptionsListControlState
  extends DefaultDataControlState,
    OptionsListDisplaySettings {
  searchTechnique?: OptionsListSearchTechnique;
  sort?: OptionsListSortingType;
  selectedOptions?: OptionsListSelection[];
  existsSelected?: boolean;
  runPastTimeout?: boolean;
  singleSelect?: boolean;
  exclude?: boolean;
}

export type OptionsListControlApi = DataControlApi;

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
  PublishesOptions & {
    deselectOption: (key: string) => void;
    makeSelection: (key: string, showOnlySelected: boolean) => void;
    allowExpensiveQueries$: PublishingSubject<boolean>;
    loadMoreSubject: BehaviorSubject<null>;
  };
