/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import type { UiSettingsCommon } from '@kbn/data-views-plugin/common';
import { getEsqlFn } from './esql';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchResponse } from '@kbn/search-types';

describe('getEsqlFn', () => {
  it('should always return a fully serializable table', async () => {
    const mockSearch = jest.fn().mockReturnValue(
      of({
        rawResponse: {
          values: [['value1']],
          columns: [{ name: 'column1', type: 'string' }],
        },
      } as IKibanaSearchResponse<ESQLSearchResponse>)
    );

    const esqlFn = getEsqlFn({
      getStartDependencies: async () => ({
        search: mockSearch,
        uiSettings: {} as UiSettingsCommon,
      }),
    });

    const input = null; // Mock input
    const args = {
      query: 'FROM index',
    };

    const context = {
      abortSignal: new AbortController().signal,
      inspectorAdapters: {},
      getKibanaRequest: jest.fn(),
      getSearchSessionId: jest.fn(),
    } as unknown as ExecutionContext;

    const result = await esqlFn.fn(input, args, context).toPromise();

    expect(result?.type).toEqual('datatable');
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
