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
import { DataControlApi, DefaultDataControlState } from '../types';

export interface OptionsListControlState extends DefaultDataControlState {
  searchTechnique?: OptionsListSearchTechnique;
  sort?: OptionsListSortingType;
  selectedOptions?: string[];
  existsSelected?: boolean;
  runPastTimeout?: boolean;
  singleSelect?: boolean;
  exclude?: boolean;

  // display settings
  // placeholder?: string;
  // hideActionBar?: boolean;
  // hideExclude?: boolean;
  // hideExists?: boolean;
  // hideSort?: boolean;
}
export interface PublishesOptions {
  availableOptions$: PublishingSubject<OptionsListSuggestions | undefined>;
  // validSelections$: PublishingSubject<Set<string>>;
  invalidSelections$: PublishingSubject<Set<string>>;

  totalCardinality$: PublishingSubject<number>;
  allowExpensiveQueries$: PublishingSubject<boolean>;
}

export type OptionsListControlApi = DataControlApi;

export interface OptionsListComponentState extends OptionsListControlState {
  searchString: string;
  requestSize: number;
}

export type OptionsListComponentApi = OptionsListControlApi &
  PublishesOptions & {
    deselectOption: (key: string) => void;
    makeSelection: (key: string, showOnlySelected: boolean) => void;
  };
