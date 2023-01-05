/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { ControlOutput } from '../types';
import {
  OptionsListField,
  OptionsListSuggestions,
  OptionsListEmbeddableInput,
} from '../../common/options_list/types';

interface SearchString {
  value: string;
  valid: boolean;
}

// Component state is only used by public components.
export interface OptionsListComponentState {
  field?: OptionsListField;
  totalCardinality?: number;
  availableOptions?: OptionsListSuggestions;
  invalidSelections?: string[];
  validSelections?: string[];
  searchString: SearchString;
}

// public only - redux embeddable state type
export type OptionsListReduxState = ReduxEmbeddableState<
  OptionsListEmbeddableInput,
  ControlOutput,
  OptionsListComponentState
>;
