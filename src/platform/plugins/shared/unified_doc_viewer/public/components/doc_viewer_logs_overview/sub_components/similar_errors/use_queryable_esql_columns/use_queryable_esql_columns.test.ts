/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import { useQueryableEsqlColumns } from '.';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

jest.mock('../../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

jest.mock('@kbn/esql-utils', () => ({
  getESQLQueryColumnsRaw: jest.fn(),
}));

const mockGetESQLQueryColumnsRaw = getESQLQueryColumnsRaw as jest.Mock;
const mockSearch = jest.fn();

(getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
  data: {
    search: {
      search: mockSearch,
    },
  },
});

describe('useQueryableEsqlColumns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not resolve columns when no index pattern is provided', () => {
    const { result } = renderHook(() => useQueryableEsqlColumns(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.queryableColumns).toBeUndefined();
    expect(mockGetESQLQueryColumnsRaw).not.toHaveBeenCalled();
  });

  it('resolves the columns of the index pattern, excluding unsupported ones', async () => {
    mockGetESQLQueryColumnsRaw.mockResolvedValue([
      { name: 'service.name', type: 'keyword' },
      { name: 'error.culprit', type: 'text' },
      { name: 'error.exception.type', type: 'unsupported' },
    ]);

    const { result } = renderHook(() => useQueryableEsqlColumns('logs-*'));

    expect(result.current.loading).toBe(true);
    expect(result.current.queryableColumns).toBeUndefined();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.queryableColumns).toEqual(new Set(['service.name', 'error.culprit']));
    expect(mockGetESQLQueryColumnsRaw).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: 'FROM logs-*',
        search: mockSearch,
      })
    );
  });

  it('reports loading until the first resolution completes', async () => {
    let resolveColumns!: (columns: Array<{ name: string; type: string }>) => void;
    mockGetESQLQueryColumnsRaw.mockReturnValue(
      new Promise((resolve) => {
        resolveColumns = resolve;
      })
    );

    const { result } = renderHook(() => useQueryableEsqlColumns('logs-*'));

    expect(result.current.loading).toBe(true);

    resolveColumns([{ name: 'service.name', type: 'keyword' }]);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.queryableColumns).toEqual(new Set(['service.name']));
  });

  it('fails open when column resolution fails: no columns and not loading', async () => {
    mockGetESQLQueryColumnsRaw.mockRejectedValue(new Error('verification_exception'));

    const { result } = renderHook(() => useQueryableEsqlColumns('logs-*'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.queryableColumns).toBeUndefined();
  });
});
