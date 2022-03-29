/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSearchSetupMock } from '../../data/server/mocks';
import { createFieldFormatsSetupMock } from '../../field_formats/server/mocks';
import { AutocompleteSetup } from './autocomplete';

const autocompleteSetupMock: jest.Mocked<AutocompleteSetup> = {
  getAutocompleteSettings: jest.fn(),
};

function createSetupContract() {
  return {
    search: createSearchSetupMock(),
    autocomplete: autocompleteSetupMock,
    /**
     * @deprecated - use directly from "fieldFormats" plugin instead
     */
    fieldFormats: createFieldFormatsSetupMock(),
  };
}

export const dataPluginMock = {
  createSetupContract,
};
