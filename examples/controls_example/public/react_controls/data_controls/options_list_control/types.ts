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
  totalCardinality$: PublishingSubject<number>;
  invalidSelections$: PublishingSubject<string[]>;
  allowExpensiveQueries$: PublishingSubject<boolean>;
  availableOptions$: PublishingSubject<OptionsListSuggestions | undefined>;
}

export interface OptionsListComponentState extends OptionsListControlState {
  searchString: string;
  requestSize: number;
}

export type OptionsListControlApi = DataControlApi & PublishesOptions; // make PublishesOptions private
