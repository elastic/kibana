/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useKibanaServices } from '../kibana_services';
import { useIsNlToEsqlAvailable } from './use_is_nl_to_esql_available';

jest.mock('../kibana_services', () => ({
  useKibanaServices: jest.fn(),
}));

describe('useIsNlToEsqlAvailable', () => {
  const esql = { hasEnterpriseLicense: jest.fn(), hasInferenceConnector: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibanaServices as jest.Mock).mockReturnValue({ esql });
  });

  it('is true with an Enterprise license and an AI connector', async () => {
    esql.hasEnterpriseLicense.mockResolvedValue(true);
    esql.hasInferenceConnector.mockResolvedValue(true);

    const { result } = renderHook(() => useIsNlToEsqlAvailable());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('is false without an Enterprise license', async () => {
    esql.hasEnterpriseLicense.mockResolvedValue(false);
    esql.hasInferenceConnector.mockResolvedValue(true);

    const { result } = renderHook(() => useIsNlToEsqlAvailable());

    await waitFor(() => expect(esql.hasEnterpriseLicense).toHaveBeenCalled());
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(result.current).toBe(false);
    expect(esql.hasInferenceConnector).not.toHaveBeenCalled();
  });
});
