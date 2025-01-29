/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Dispatch } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import type { FiltersBuilderActions } from './reducer';
import { SuggestionsAbstraction } from '../typeahead/suggestions_component';

interface FiltersBuilderContextType {
  dataView: DataView;
  dispatch: Dispatch<FiltersBuilderActions>;
  globalParams: {
    maxDepth: number;
    hideOr: boolean;
  };
  dropTarget: string;
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
  disabled: boolean;
  suggestionsAbstraction?: SuggestionsAbstraction;
}

export const FiltersBuilderContextType = React.createContext<FiltersBuilderContextType>(
  {} as FiltersBuilderContextType
);
