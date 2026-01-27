/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import '@kbn/react-query/mock';
import * as ReactQuery from '@kbn/react-query';
import { waitFor, renderHook } from '@testing-library/react';
import { useFetchUnifiedAlertsFields } from './use_fetch_unified_alerts_fields';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core/public/mocks';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

const { useQuery } = ReactQuery;

const mockHttpClient = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

const { queryClient, provider: wrapper } = createTestResponseOpsQueryClient({
  dependencies: {
    notifications,
  },
});

const emptyData = { fields: [] };

describe('useFetchAlertsFieldsNewApi', () => {
  const mockHttpGet = jest.mocked(mockHttpClient.get);

  beforeEach(() => {
    mockHttpGet.mockResolvedValue({
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });
    (useQuery as jest.Mock).mockClear();
  });

  afterEach(() => {
    mockHttpGet.mockClear();
    queryClient.clear();
  });

  it('should return all fields when empty rule types', async () => {
    const { result, rerender } = renderHook(
      () =>
        useFetchUnifiedAlertsFields({
          http: mockHttpClient,
          ruleTypeIds: [],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(mockHttpGet).toHaveBeenCalledWith('/internal/rac/alerts/fields', {
        query: { rule_type_ids: [] },
      });
    });

    rerender();

    expect(result.current.data).toEqual({
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });
  });

  it('should fetch for single rule types', () => {
    const { result } = renderHook(
      () =>
        useFetchUnifiedAlertsFields({
          http: mockHttpClient,
          ruleTypeIds: ['logs', 'siem.esqlRule', 'siem.eqlRule'],
        }),
      {
        wrapper,
      }
    );

    expect(mockHttpGet).toHaveBeenCalledTimes(1);
    expect(mockHttpGet).toHaveBeenCalledWith('/internal/rac/alerts/fields', {
      query: { rule_type_ids: ['logs', 'siem.esqlRule', 'siem.eqlRule'] },
    });
    expect(result.current.data).toEqual(emptyData);
  });

  it('should correctly override the `enabled` option', () => {
    const { rerender } = renderHook(
      ({
        ruleTypeIds,
        enabled,
      }: React.PropsWithChildren<{ ruleTypeIds: string[]; enabled?: boolean }>) =>
        useFetchUnifiedAlertsFields({ http: mockHttpClient, ruleTypeIds }, { enabled }),
      {
        wrapper,
        initialProps: {
          ruleTypeIds: ['apm'],
          enabled: false,
        },
      }
    );

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }), {});

    rerender({ ruleTypeIds: [], enabled: true });

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }), {});
  });

  it('should call the api only once', async () => {
    const { result, rerender } = renderHook(
      () =>
        useFetchUnifiedAlertsFields({
          http: mockHttpClient,
          ruleTypeIds: ['apm'],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual({
        fields: [
          {
            name: 'fakeCategory',
          },
        ],
      });
    });

    rerender();

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual({
        fields: [
          {
            name: 'fakeCategory',
          },
        ],
      });
    });
  });

  it('should show error toast on fetch failure', async () => {
    mockHttpGet.mockRejectedValue(new Error('Something went wrong'));

    const { result } = renderHook(
      () =>
        useFetchUnifiedAlertsFields({
          http: mockHttpClient,
          ruleTypeIds: [],
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledTimes(1);

      expect(result.current.isError).toBe(true);
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Unable to load alert fields',
      });
    });
  });
});
