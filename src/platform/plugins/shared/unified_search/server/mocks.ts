/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { Observable } from 'rxjs';
import { ConfigSchema } from './config';
import { AutocompleteSetup } from './autocomplete';

const autocompleteSetupMock: jest.Mocked<AutocompleteSetup> = {
  getAutocompleteSettings: jest.fn(),
  // @ts-ignore as it is partially defined because not all fields are needed
  getInitializerContextConfig: jest.fn(() => ({
    create: jest.fn(
      () =>
        new Observable<ConfigSchema>((subscribe) =>
          subscribe.next({
            autocomplete: {
              querySuggestions: { enabled: true },
              valueSuggestions: {
                enabled: true,
                tiers: [],
                terminateAfter: moment.duration(),
                timeout: moment.duration(),
              },
            },
          })
        )
    ),
  })),
};

function createSetupContract() {
  return {
    autocomplete: autocompleteSetupMock,
  };
}

export const dataPluginMock = {
  createSetupContract,
};
