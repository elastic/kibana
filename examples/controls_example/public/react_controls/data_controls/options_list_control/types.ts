/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';
import { OptionsListSearchTechnique } from '@kbn/controls-plugin/common/options_list/suggestions_searching';
import { OptionsListSortingType } from '@kbn/controls-plugin/common/options_list/suggestions_sorting';
import { DataControlApi, DefaultDataControlState } from '../types';

export const OPTIONS_LIST_CONTROL_TYPE = OPTIONS_LIST_CONTROL;

export const DEFAULT_SEARCH_TECHNIQUE: OptionsListSearchTechnique = 'prefix';

export interface OptionsListControlState extends DefaultDataControlState {
  searchTechnique?: OptionsListSearchTechnique;
  sort?: OptionsListSortingType;
  selectedOptions?: string[];
  existsSelected?: boolean;
  runPastTimeout?: boolean;
  singleSelect?: boolean;
  exclude?: boolean;

  // display settings
  placeholder?: string;
  hideActionBar?: boolean;
  hideExclude?: boolean;
  hideExists?: boolean;
  hideSort?: boolean;
}
export type OptionsListControlApi = DataControlApi;
