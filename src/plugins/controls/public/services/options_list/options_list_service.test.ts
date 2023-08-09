/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { optionsListServiceFactory } from './options_list_service';

describe('runOptionsListRequest', () => {
  test('should return OptionsListFailureResponse when fetch throws', async () => {
    const mockCore = {
      coreStart: {
        uiSettings: {
          get: () => {
            return undefined;
          },
        },
      },
    };
    const mockData = {
      query: {
        timefilter: {
          timefilter: {},
        },
      },
    } as unknown as ControlsDataService;
    const mockHttp = {
      fetch: () => {
        throw new Error('Simulated network error');
      },
    } as unknown as ControlsHTTPService;
    const optionsListService = optionsListServiceFactory(mockCore, {
      data: mockData,
      http: mockHttp,
    });

    const mockAbortSignal = {} as unknown as AbortSignal;
    const response = await optionsListService.runOptionsListRequest(
      {
        dataView: {
          toSpec: () => {
            return {};
          },
          title: 'myDataView',
        },
        field: {
          name: 'myField',
        },
      },
      {} as unknown as AbortSignal
    );

    expect(response.error.message).toBe('Simulated network error');
  });
});
