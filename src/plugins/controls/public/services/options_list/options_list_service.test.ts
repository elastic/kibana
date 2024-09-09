/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import { KibanaPluginServiceParams } from '@kbn/presentation-util-plugin/public';
import type { OptionsListRequest } from '../../../common/options_list/types';
import type { ControlsPluginStartDeps } from '../../types';
import type { ControlsHTTPService } from '../http/types';
import type { ControlsDataService } from '../data/types';
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
    } as unknown as KibanaPluginServiceParams<ControlsPluginStartDeps>;
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

    const response = (await optionsListService.runOptionsListRequest(
      {
        dataView: {
          toSpec: () => {
            return {};
          },
          title: 'myDataView',
        } as unknown as DataView,
        field: {
          name: 'myField',
        } as unknown as FieldSpec,
      } as unknown as OptionsListRequest,
      {} as unknown as AbortSignal
    )) as any;

    expect(response.error.message).toBe('Simulated network error');
  });
});
