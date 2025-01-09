/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import * as api from '../apis/bulk_get_cases';
import { useBulkGetCasesQuery } from './use_bulk_get_cases';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { testQueryClientConfig } from '../utils/test';
import React, { PropsWithChildren } from 'react';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';

jest.mock('../apis/bulk_get_cases');

const response = {
  cases: [],
  errors: [],
};

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const queryClient = new QueryClient(testQueryClientConfig);

const wrapper = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
      {children}
    </QueryClientProvider>
  );
};

describe('useBulkGetCasesQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'bulkGetCases');
    spy.mockResolvedValue(response);

    renderHook(() => useBulkGetCasesQuery({ caseIds: ['case-1'], http, notifications }), {
      wrapper,
    });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        {
          ids: ['case-1'],
        },
        expect.any(AbortSignal)
      )
    );
  });

  it('does not call the api if the fetchCases is false', async () => {
    const spy = jest.spyOn(api, 'bulkGetCases');
    spy.mockResolvedValue(response);

    renderHook(
      () => useBulkGetCasesQuery({ caseIds: ['case-1'], http, notifications }, { enabled: false }),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(spy).not.toHaveBeenCalled());
  });

  it('shows a toast error when the api return an error', async () => {
    const spy = jest.spyOn(api, 'bulkGetCases').mockRejectedValue(new Error('An error'));

    renderHook(() => useBulkGetCasesQuery({ caseIds: ['case-1'], http, notifications }), {
      wrapper,
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        {
          ids: ['case-1'],
        },
        expect.any(AbortSignal)
      );
      expect(notifications.toasts.addError).toHaveBeenCalled();
    });
  });
});
