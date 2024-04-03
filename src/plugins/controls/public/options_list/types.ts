/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { FieldSpec } from '@kbn/data-views-plugin/common';

import { ControlOutput } from '../types';
import {
  OptionsListSuggestions,
  OptionsListEmbeddableInput,
} from '../../common/options_list/types';

export const MIN_OPTIONS_LIST_REQUEST_SIZE = 10;
export const MAX_OPTIONS_LIST_REQUEST_SIZE = 1000;

interface SearchString {
  value: string;
  valid: boolean;
}

// Component state is only used by public components.
export interface OptionsListComponentState {
  availableOptions?: OptionsListSuggestions;
  allowExpensiveQueries: boolean;
  invalidSelections?: string[];
  searchString: SearchString;
  validSelections?: string[];
  totalCardinality?: number;
  popoverOpen: boolean;
  field?: FieldSpec;
  error?: string;
  showInvalidSelectionWarning?: boolean;
}

// public only - redux embeddable state type
export type OptionsListReduxState = ReduxEmbeddableState<
  OptionsListEmbeddableInput,
  ControlOutput,
  OptionsListComponentState
>;
