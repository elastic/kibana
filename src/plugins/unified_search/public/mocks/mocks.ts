/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnifiedSearchPublicPlugin } from '../plugin';
import type { AutocompleteStart, AutocompleteSetup } from '../autocomplete';

export type Setup = jest.Mocked<ReturnType<UnifiedSearchPublicPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<UnifiedSearchPublicPlugin['start']>>;

const autocompleteSetupMock: jest.Mocked<AutocompleteSetup> = {
  getQuerySuggestions: jest.fn(),
  getAutocompleteSettings: jest.fn(),
};

const autocompleteStartMock: jest.Mocked<AutocompleteStart> = {
  getValueSuggestions: jest.fn(),
  getQuerySuggestions: jest.fn(),
  hasQuerySuggestions: jest.fn(),
};

const createSetupContract = (): Setup => {
  return {
    autocomplete: autocompleteSetupMock,
  };
};

const createStartContract = (): Start => {
  return {
    autocomplete: autocompleteStartMock,
    ui: {
      IndexPatternSelect: jest.fn(),
      getCustomSearchBar: jest.fn(),
      SearchBar: jest.fn().mockReturnValue(null),
      AggregateQuerySearchBar: jest.fn().mockReturnValue(null),
      FiltersBuilderLazy: jest.fn(),
      QueryStringInput: jest.fn().mockReturnValue('QueryStringInput'),
    },
  };
};

export const unifiedSearchPluginMock = {
  createStartContract,
  createSetupContract,
};
