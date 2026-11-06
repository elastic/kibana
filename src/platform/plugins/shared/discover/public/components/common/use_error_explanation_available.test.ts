/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { HttpStart } from '@kbn/core/public';
import { useErrorExplanationAvailable } from './use_error_explanation_available';

const buildHttp = (available: boolean) =>
  ({ get: jest.fn().mockResolvedValue({ available }) } as unknown as Pick<HttpStart, 'get'>);

describe('useErrorExplanationAvailable', () => {
  it('is false until the server says the action can be used', async () => {
    const { result } = renderHook(() => useErrorExplanationAvailable(buildHttp(true), true));

    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('stays false when the action cannot be used', async () => {
    const http = buildHttp(false);
    const { result } = renderHook(() => useErrorExplanationAvailable(http, true));

    await waitFor(() => expect(http.get).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('does not ask the server when there is no error to explain', () => {
    const http = buildHttp(true);
    const { result } = renderHook(() => useErrorExplanationAvailable(http, false));

    expect(result.current).toBe(false);
    expect(http.get).not.toHaveBeenCalled();
  });
});
