/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch } from 'react';
import React from 'react';
import type { Filter } from '@kbn/es-query';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import type { FilterableSource } from '@kbn/data-source';
import type { FiltersBuilderActions } from './reducer';

interface FiltersBuilderContextType {
  dataView: FilterableSource;
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
