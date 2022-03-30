/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UnifiedSearchPublicPlugin } from './plugin';
import { AutocompleteStart, AutocompleteSetup } from './autocomplete';

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
    ui: {
      IndexPatternSelect: jest.fn(),
      SearchBar: jest.fn().mockReturnValue(null),
    },
    autocomplete: autocompleteStartMock,
  };
};

export const unifiedSearchPluginMock = {
  createSetupContract,
  createStartContract,
};
