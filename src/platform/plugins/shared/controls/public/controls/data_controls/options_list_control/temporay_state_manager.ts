/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import type { OptionsListSelection } from '@kbn/controls-schemas';
import type { OptionsListSuggestions } from '../../../../common/options_list';
import { MIN_OPTIONS_LIST_REQUEST_SIZE } from './constants';

export interface TemporaryState {
  searchString: string;
  searchStringValid: boolean;
  requestSize: number;
  dataLoading: boolean | undefined;
  availableOptions: OptionsListSuggestions | undefined;
  invalidSelections: Set<OptionsListSelection>;
  totalCardinality: number;
}

const defaultTemporaryState = {
  searchString: '',
  searchStringValid: true,
  requestSize: MIN_OPTIONS_LIST_REQUEST_SIZE,
  dataLoading: false,
  availableOptions: undefined,
  invalidSelections: new Set() as Set<OptionsListSelection>,
  totalCardinality: 0,
};

export const initializeTemporayStateManager = () => {
  return initializeStateManager<TemporaryState>(defaultTemporaryState, defaultTemporaryState);
};
