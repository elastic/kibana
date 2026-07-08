/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext } from 'react';
import { renderHook } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { QueryClient } from '@kbn/react-query';
import { useFetchAlertsFieldsQuery } from './use_fetch_alerts_fields_query';
import { useAlertFieldNames } from './use_alert_field_names';

jest.mock('./use_fetch_alerts_fields_query');
const mockUseFetchAlertsFieldsQuery = useFetchAlertsFieldsQuery as jest.Mock;

const http = httpServiceMock.createStartContract();

describe('useAlertFieldNames', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps fetched fields to leaf scalar field names', () => {
    mockUseFetchAlertsFieldsQuery.mockReturnValue({
      data: {
        browserFields: {},
        fields: [
          { name: 'kibana.alert.status', type: 'keyword', esTypes: ['keyword'] },
          { name: 'kibana.alert.rule.parameters', type: 'object', esTypes: ['object'] },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useAlertFieldNames({ http, ruleTypeIds: ['.es-query'] }));

    expect(result.current.fieldNames).toEqual(['kibana.alert.status']);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns an empty list while there is no data', () => {
    mockUseFetchAlertsFieldsQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useAlertFieldNames({ http, ruleTypeIds: ['.es-query'] }));

    expect(result.current.fieldNames).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('disables the query when there are no rule type ids', () => {
    mockUseFetchAlertsFieldsQuery.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useAlertFieldNames({ http, ruleTypeIds: [] }));

    expect(mockUseFetchAlertsFieldsQuery).toHaveBeenCalledWith(
      { http, ruleTypeIds: [] },
      expect.objectContaining({ enabled: false })
    );
  });

  it('respects an explicit enabled=false override', () => {
    mockUseFetchAlertsFieldsQuery.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useAlertFieldNames({ http, ruleTypeIds: ['.es-query'], enabled: false }));

    expect(mockUseFetchAlertsFieldsQuery).toHaveBeenCalledWith(
      { http, ruleTypeIds: ['.es-query'] },
      expect.objectContaining({ enabled: false })
    );
  });

  it('forwards the react-query context so the query resolves against the caller’s QueryClient', () => {
    mockUseFetchAlertsFieldsQuery.mockReturnValue({ data: undefined, isLoading: false });
    const context = createContext<QueryClient | undefined>(undefined);

    renderHook(() => useAlertFieldNames({ http, ruleTypeIds: ['.es-query'], context }));

    expect(mockUseFetchAlertsFieldsQuery).toHaveBeenCalledWith(
      { http, ruleTypeIds: ['.es-query'] },
      expect.objectContaining({ context })
    );
  });
});
